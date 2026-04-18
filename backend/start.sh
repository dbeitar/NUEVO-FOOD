#!/bin/bash
cd "/Users/cesargomez/Desktop/PROYECTOFOOD PLAN/backend"
echo "🚀 Iniciando servidor..."
node server.js &
SERVER_PID=$!
sleep 3
echo ""
echo "📡 Probando conexión..."
curl -s http://localhost:5000/api/health && echo "" || echo "❌ No hay respuesta"
echo ""
echo "PID del servidor: $SERVER_PID"
echo "Para detener: kill $SERVER_PID"
wait
