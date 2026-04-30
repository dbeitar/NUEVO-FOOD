# 📋 Resumen de Módulos de Entrenamiento en Food Plan

## 🏋️ 1. Mi Dashboard de Entrenamiento (TrainingModule.jsx)

### 🎯 Objetivo Principal:
Proporcionar a los usuarios finales una interfaz completa para gestionar su rutina de entrenamiento personalizada, con generación automática de planes, seguimiento en tiempo real y asistencia IA para sustituciones de ejercicios.

### 🏗️ Cómo está construido:
- **Frontend**: Componente React con hooks (useState, useEffect, useMemo)
- **Backend**: Controladores en Node.js con lógica de generación de planes
- **Datos**: Almacenamiento en archivos JSON locales (`training_library.json`)
- **Arquitectura**: Cliente-servidor con APIs REST

### 📊 Pilares principales:
1. **Generación de Planes**: Algoritmo que crea rutinas basadas en nivel, método y días disponibles
2. **Seguimiento en Tiempo Real**: Componente `TrainingRealtimeCoach` para guiar durante el entrenamiento
3. **Asistente IA**: Sistema de sustitución de ejercicios basado en lógica de similitud
4. **Registro de Entrenamientos**: Logging detallado de sesiones completadas

### ⚙️ Cómo se construyó:
- **Lógica de Generación**: Basada en reglas científicas (sets por músculo, RPE, tempo)
- **Biblioteca de Ejercicios**: JSON estructurado con categorías y prioridades musculares
- **IA Simple**: Algoritmos de matching para encontrar ejercicios alternativos
- **Estado React**: Gestión compleja de planes, días y ejercicios seleccionados

---

## 👨‍🏫 2. Maestro de Entrenamiento (AdminTrainingManager.jsx)

### 🎯 Objetivo Principal:
Herramienta administrativa para que entrenadores y administradores puedan crear, editar y gestionar planes de entrenamiento personalizados para usuarios específicos, con capacidades de edición avanzada y seguimiento de logs.

### 🏗️ Cómo está construido:
- **Frontend**: Componente React con múltiples pestañas (planes, editor, logs)
- **Backend**: Controladores especializados (`adminTrainingController.js`)
- **Base de Datos**: Sistema de archivos JSON para persistencia
- **Interfaz**: Formularios complejos con validación y feedback

### 📊 Pilares principales:
1. **Gestión de Planes**: CRUD completo de planes de entrenamiento estructurados
2. **Editor Visual**: Interfaz para modificar días, ejercicios y prescripciones
3. **Generador Automático**: Creación de planes basada en parámetros de usuario
4. **Sistema de Logs**: Seguimiento detallado de todas las sesiones de entrenamiento
5. **Asignación a Usuarios**: Vinculación de planes específicos a usuarios individuales

### ⚙️ Cómo se construyó:
- **Estructura de Datos**: Planes organizados por días, con ejercicios y prescripciones
- **APIs RESTful**: Endpoints para todas las operaciones CRUD
- **Validación**: Lógica de negocio para asegurar integridad de datos
- **Interfaz de Usuario**: Pestañas organizadas con formularios dinámicos

---

## 🎥 3. Galería de Entrenamiento (AdminTrainingGallery.jsx)

### 🎯 Objetivo Principal:
Repositorio centralizado de videos de ejercicios para que administradores puedan gestionar una biblioteca visual de movimientos, facilitando la referencia y enseñanza de técnicas correctas.

### 🏗️ Cómo está construido:
- **Frontend**: Componente React simple con formulario y lista
- **Backend**: Endpoints básicos de CRUD para gestión de videos
- **Almacenamiento**: Modelo `ExercisesGalleryStore` con persistencia JSON
- **Integración**: URLs de YouTube embebidas automáticamente

### 📊 Pilares principales:
1. **Biblioteca Visual**: Colección organizada de videos por grupo muscular
2. **Gestión Simple**: Interfaz intuitiva para agregar, ver y eliminar videos
3. **Integración YouTube**: Conversión automática de URLs a embeds
4. **Acceso Público**: Endpoint para que usuarios vean la galería

### ⚙️ Cómo se construyó:
- **Modelo Simple**: Almacenamiento básico con ID, nombre, grupo muscular y URL
- **Conversión de URLs**: Función `toEmbedUrl` para transformar links de YouTube
- **Interfaz Minimalista**: Formulario básico con lista de resultados
- **APIs Básicas**: Endpoints REST para operaciones CRUD simples

---

## 🔗 Relación entre Módulos:

- **TrainingModule** consume datos de la **Galería** para mostrar videos de ejercicios
- **AdminTrainingManager** usa la **Galería** para enriquecer los planes con referencias visuales
- Los tres módulos comparten la misma **biblioteca de ejercicios** (`training_library.json`)
- **AdminTrainingManager** genera planes que son consumidos por **TrainingModule**

## 🛠️ Tecnologías Comunes:
- **Frontend**: React con hooks y Context API
- **Backend**: Node.js + Express con middleware de autenticación
- **Persistencia**: Archivos JSON para desarrollo (configurable para BD)
- **Estilos**: Tailwind CSS para interfaces consistentes
- **APIs**: RESTful con manejo de errores y validación

Esta arquitectura modular permite una separación clara de responsabilidades: gestión administrativa, consumo de usuario y biblioteca de recursos compartida.

---

*Generado automáticamente el 27 de abril de 2026*