#!/usr/bin/env bash
# 008/T023, D36: ensaio de restauração automatizado. Sobe um cluster kind, o CloudNativePG e um
# SeaweedFS como S3, grava dados, faz backup, restaura num cluster novo e confere que os dados voltaram.
# Sem este ensaio verde, a feature 008 não fecha.
set -euo pipefail
CNPG_VERSION=${CNPG_VERSION:-1.27.0}
NS=drill

kind create cluster --name lubyvet-drill --wait 120s
trap 'kind delete cluster --name lubyvet-drill' EXIT
# O nó do kind não baixa imagens por conta própria: o host baixa e carrega no cluster.
for img in ghcr.io/cloudnative-pg/cloudnative-pg:${CNPG_VERSION} ghcr.io/cloudnative-pg/postgresql:17.6 chrislusf/seaweedfs:3.97 amazon/aws-cli:2.31.0; do
  docker pull -q "$img" >/dev/null && docker save "$img" | docker exec -i lubyvet-drill-control-plane ctr --namespace=k8s.io images import -
done
kubectl apply --server-side -f "https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-${CNPG_VERSION%.*}/releases/cnpg-${CNPG_VERSION}.yaml"
kubectl -n cnpg-system rollout status deploy/cnpg-controller-manager --timeout=180s
kubectl create namespace $NS

# S3 de ensaio (SeaweedFS), com credenciais geradas na hora (nunca versionadas).
KEY=$(openssl rand -hex 12); SECRET=$(openssl rand -hex 24)
kubectl -n $NS create secret generic lubyvet-backup-s3 --from-literal=ACCESS_KEY_ID="$KEY" --from-literal=ACCESS_SECRET_KEY="$SECRET"
kubectl -n $NS create configmap s3cfg --from-literal=s3.json="{\"identities\":[{\"name\":\"drill\",\"credentials\":[{\"accessKey\":\"$KEY\",\"secretKey\":\"$SECRET\"}],\"actions\":[\"Admin\",\"Read\",\"Write\",\"List\",\"Tagging\"]}]}"
cat <<YAML | kubectl -n $NS apply -f -
apiVersion: v1
kind: Pod
metadata: { name: s3, labels: { app: s3 } }
spec:
  containers:
    - name: s3
      image: chrislusf/seaweedfs:3.97
      imagePullPolicy: IfNotPresent
      args: ["server", "-dir=/data", "-s3", "-s3.port=8333", "-s3.config=/cfg/s3.json"]
      volumeMounts: [{ name: cfg, mountPath: /cfg }]
  volumes: [{ name: cfg, configMap: { name: s3cfg } }]
YAML
kubectl -n $NS expose pod s3 --port=8333
kubectl -n $NS wait --for=condition=Ready pod/s3 --timeout=180s
for i in $(seq 1 30); do
  kubectl -n $NS run "mb-$i" --rm -i --restart=Never --image=amazon/aws-cli:2.31.0 --image-pull-policy=IfNotPresent --env="AWS_ACCESS_KEY_ID=$KEY" --env="AWS_SECRET_ACCESS_KEY=$SECRET" --env=AWS_DEFAULT_REGION=us-east-1 -- --endpoint-url http://s3:8333 s3 mb s3://lubyvet && break
  sleep 5
done

S3="--set postgres.backup.destinationPath=s3://lubyvet/drill --set postgres.backup.endpointURL=http://s3.$NS:8333 --set postgres.instances=1 --set postgres.storage=1Gi"
helm template drill deploy/helm/lubyvet $S3 --set images.api=x/api@sha256:0 --set images.web=x/web@sha256:0 --set host=drill.local --show-only templates/postgres.yaml | kubectl -n $NS apply -f -
kubectl -n $NS wait --for=condition=Ready cluster/lubyvet-db --timeout=300s

PRIMARY=$(kubectl -n $NS get pod -l cnpg.io/cluster=lubyvet-db,role=primary -o name)
kubectl -n $NS exec "$PRIMARY" -- psql -U postgres -d lubyvet -c "create table drill(v text); insert into drill values ('dado-de-ensaio');"
kubectl -n $NS exec "$PRIMARY" -- psql -U postgres -c "select pg_switch_wal();"
cat <<YAML | kubectl -n $NS apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata: { name: drill-backup }
spec: { cluster: { name: lubyvet-db } }
YAML
kubectl -n $NS wait --for=jsonpath='{.status.phase}'=completed backup/drill-backup --timeout=300s

# Restauração num cluster NOVO a partir do bucket.
cat <<YAML | kubectl -n $NS apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata: { name: lubyvet-db-restored }
spec:
  instances: 1
  storage: { size: 1Gi }
  bootstrap: { recovery: { source: origin } }
  externalClusters:
    - name: origin
      barmanObjectStore:
        destinationPath: s3://lubyvet/drill
        endpointURL: http://s3.$NS:8333
        serverName: lubyvet-db
        s3Credentials:
          accessKeyId: { name: lubyvet-backup-s3, key: ACCESS_KEY_ID }
          secretAccessKey: { name: lubyvet-backup-s3, key: ACCESS_SECRET_KEY }
YAML
kubectl -n $NS wait --for=condition=Ready cluster/lubyvet-db-restored --timeout=600s
RESTORED=$(kubectl -n $NS get pod -l cnpg.io/cluster=lubyvet-db-restored,role=primary -o name)
VALUE=$(kubectl -n $NS exec "$RESTORED" -- psql -U postgres -d lubyvet -tAc "select v from drill")
[ "$VALUE" = "dado-de-ensaio" ] || { echo "ENSAIO FALHOU: valor restaurado '$VALUE'"; exit 1; }
echo "ENSAIO DE RESTAURAÇÃO VERDE"
