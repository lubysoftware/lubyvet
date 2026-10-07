#!/usr/bin/env bash
# 008/T023, D36: ensaio de restauração automatizado. Sobe um cluster kind, o CloudNativePG e um
# MinIO como S3, grava dados, faz backup, restaura num cluster novo e confere que os dados voltaram.
# Sem este ensaio verde, a feature 008 não fecha.
set -euo pipefail
CNPG_VERSION=${CNPG_VERSION:-1.27.0}
NS=drill

kind create cluster --name lubyvet-drill --wait 120s
trap 'kind delete cluster --name lubyvet-drill' EXIT
kubectl apply --server-side -f "https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-${CNPG_VERSION%.*}/releases/cnpg-${CNPG_VERSION}.yaml"
kubectl -n cnpg-system rollout status deploy/cnpg-controller-manager --timeout=180s
kubectl create namespace $NS

# MinIO de ensaio, fora do namespace do banco, com credenciais geradas na hora (nunca versionadas).
KEY=$(openssl rand -hex 12); SECRET=$(openssl rand -hex 24)
kubectl -n $NS create secret generic lubyvet-backup-s3 --from-literal=ACCESS_KEY_ID="$KEY" --from-literal=ACCESS_SECRET_KEY="$SECRET"
kubectl -n $NS run minio --image=quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z --env="MINIO_ROOT_USER=$KEY" --env="MINIO_ROOT_PASSWORD=$SECRET" --port=9000 -- server /data
kubectl -n $NS expose pod minio --port=9000
kubectl -n $NS wait --for=condition=Ready pod/minio --timeout=300s
kubectl -n $NS run mc --rm -i --restart=Never --image=quay.io/minio/mc:RELEASE.2025-04-16T18-13-26Z --command -- sh -c "mc alias set m http://minio:9000 $KEY $SECRET && mc mb m/lubyvet"

S3="--set postgres.backup.destinationPath=s3://lubyvet/drill --set postgres.backup.endpointURL=http://minio.$NS:9000 --set postgres.instances=1 --set postgres.storage=1Gi"
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
        endpointURL: http://minio.$NS:9000
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
