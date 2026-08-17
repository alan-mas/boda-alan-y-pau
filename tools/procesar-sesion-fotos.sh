#!/bin/bash
# Comprime las fotos originales de "img/eng_pics/FULL JPG/" (no se suben a git,
# pesan ~600MB) a un par -lg/-sm por foto en "img/eng_pics/sesion-completa/",
# con el mismo tratamiento que ya se usa para el resto de fotos de compromiso
# (ancho 1067px para el lightbox, 333px para el thumbnail). Genera también
# manifest.json con la lista de fotos para que js/sesion.js arme la galería.
#
# Uso: bash tools/procesar-sesion-fotos.sh
# Requiere: sips (viene con macOS, no hay que instalar nada).

set -euo pipefail

ORIGEN="img/eng_pics/FULL JPG"
DESTINO="img/eng_pics/sesion-completa"
ANCHO_LG=1067
CALIDAD_LG=70
ANCHO_SM=333
CALIDAD_SM=60

if [ ! -d "$ORIGEN" ]; then
  echo "No se encontró la carpeta \"$ORIGEN\". Corre este script desde la raíz del proyecto."
  exit 1
fi

mkdir -p "$DESTINO"

nombres=()
total=$(find "$ORIGEN" -type f -iname "*.jpg" | wc -l | tr -d ' ')
i=0

for archivo in "$ORIGEN"/*.jpg; do
  i=$((i + 1))
  base=$(basename "$archivo" .jpg)
  echo "[$i/$total] $base"

  sips -s format jpeg -s formatOptions "$CALIDAD_LG" --resampleWidth "$ANCHO_LG" \
    "$archivo" --out "$DESTINO/${base}-lg.jpg" >/dev/null

  sips -s format jpeg -s formatOptions "$CALIDAD_SM" --resampleWidth "$ANCHO_SM" \
    "$archivo" --out "$DESTINO/${base}-sm.jpg" >/dev/null

  nombres+=("\"$base\"")
done

{
  echo "["
  for j in "${!nombres[@]}"; do
    coma=","
    [ "$j" -eq $((${#nombres[@]} - 1)) ] && coma=""
    echo "  ${nombres[$j]}$coma"
  done
  echo "]"
} > "$DESTINO/manifest.json"

echo "Listo: $total fotos procesadas en $DESTINO"
du -sh "$DESTINO"
