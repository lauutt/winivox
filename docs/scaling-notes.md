# Scaling Notes (para después del PoC)

Estas decisiones ya están preparadas:

## Fácil de escalar
- Reemplazar Redis queue por SQS
- Reemplazar MinIO por S3
- Agregar OpenSearch
- Separar workers por tipo
- Agregar HLS

## No requiere reescritura
- Modelo de eventos
- Buckets privados/públicos
- Estados del audio
- Anonimización por copia

---

## Qué NO escalar prematuramente
- Microservicios
- Kubernetes
- Recomendaciones ML
- Social graph
