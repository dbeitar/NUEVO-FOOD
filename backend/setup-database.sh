#!/bin/bash

# Script para configurar PostgreSQL y la base de datos Food Plan
# Ejecutar con: bash setup-database.sh

echo "🗄️  Configurando PostgreSQL para Food Plan..."

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Por favor instálalo primero."
    exit 1
fi

# Cambiar contraseña de postgres a 'food'
echo "🔑 Cambiando contraseña de postgres..."
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'food';" 2>/dev/null || echo "⚠️  Nota: Usa psql para cambiar la contraseña manualmente si lo necesitas"

# Crear base de datos
echo "📊 Creando base de datos foodplan_db..."
psql -U postgres -c "CREATE DATABASE foodplan_db;" 2>/dev/null || echo "⚠️  La base de datos podría que ya exista"

# Crear tablas
echo "📋 Creando tablas..."
psql -U postgres -d foodplan_db -f database.sql

echo "✅ Base de datos configurada correctamente!"
echo ""
echo "Datos de conexión:"
echo "├─ Host: localhost"
echo "├─ Puerto: 5432"
echo "├─ Base de datos: foodplan_db"
echo "├─ Usuario: postgres"
echo "└─ Contraseña: food"
