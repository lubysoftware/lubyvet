{{- define "lubyvet.env" -}}
- name: DATABASE_URL
  valueFrom: { secretKeyRef: { name: {{ .Values.secrets.database }}, key: uri } }
- name: REDIS_URL
  valueFrom: { secretKeyRef: { name: {{ .Values.secrets.redis }}, key: url } }
- name: RABBITMQ_URL
  valueFrom: { secretKeyRef: { name: {{ .Values.secrets.rabbitmq }}, key: url } }
- name: CLINIC_NAME
  value: {{ .Values.clinic.name | quote }}
- name: CLINIC_PHONE
  value: {{ .Values.clinic.phone | quote }}
- name: NODE_ENV
  value: production
{{- end -}}

{{- define "lubyvet.probe" -}}
timeoutSeconds: {{ .timeoutSeconds }}, periodSeconds: {{ .periodSeconds }}, failureThreshold: {{ .failureThreshold }}
{{- end -}}
