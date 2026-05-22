import { Injectable, Logger } from '@nestjs/common';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  async chat(message: string, history: ChatMessage[] = [], context?: any): Promise<{ response: string }> {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_KEY) {
      this.logger.warn('ANTHROPIC_API_KEY no configurada — usando respuesta automática');
      return { response: this.fallbackResponse(message) };
    }

    const goalLabels: Record<string, string> = {
      LOSE: 'perder peso', GAIN: 'ganar masa muscular', MAINTAIN: 'mantener peso',
    };
    const activityLabels: Record<string, string> = {
      SEDENTARY: 'sedentario', LIGHT: 'actividad ligera', MODERATE: 'moderadamente activo',
      ACTIVE: 'muy activo', VERY_ACTIVE: 'extremadamente activo',
    };
    const genderLabels: Record<string, string> = {
      MALE: 'masculino', FEMALE: 'femenino', OTHER: 'otro',
    };

    const systemPrompt = [
      'Eres FoodBot, asistente nutricional experto de Food Plan.',
      'Reglas de respuesta:',
      '1. Máximo 2 párrafos cortos O una lista de máximo 5 puntos — nunca ambos.',
      '2. Si usas lista, cada punto máximo 1 línea.',
      '3. Usa los datos personales del usuario para dar cifras exactas, no rangos genéricos.',
      '4. Termina siempre con 1 consejo práctico concreto.',
      '5. Tono: directo, amigable, sin relleno.',
      'Te especializas en: nutrición, macronutrientes, reemplazo de alimentos y pérdida/ganancia de peso.',
      'IMPORTANTE: Personaliza cada respuesta con los datos del usuario.',
      context?.name           ? `El nombre del usuario es: ${context.name}.` : '',
      context?.gender         ? `Su género es: ${genderLabels[context.gender] || context.gender}.` : '',
      context?.age            ? `Su edad es: ${context.age} años.` : '',
      context?.weightKg       ? `Su peso actual es: ${context.weightKg} kg.` : '',
      context?.heightCm       ? `Su estatura es: ${context.heightCm} cm.` : '',
      context?.goalType       ? `Su objetivo es: ${goalLabels[context.goalType] || context.goalType}.` : '',
      context?.activityLevel  ? `Su nivel de actividad física es: ${activityLabels[context.activityLevel] || context.activityLevel}.` : '',
      context?.dailyCalories  ? `Sus calorías diarias asignadas son: ${context.dailyCalories} kcal.` : '',
      context?.dailyProteinG  ? `Su meta de proteínas es: ${context.dailyProteinG}g/día.` : '',
      context?.dailyCarbsG    ? `Su meta de carbohidratos es: ${context.dailyCarbsG}g/día.` : '',
      context?.dailyFatG      ? `Su meta de grasas es: ${context.dailyFatG}g/día.` : '',
      context?.hasDietaryRestrictions && context?.dietaryRestrictionsDetail
        ? `Tiene restricciones dietéticas: ${context.dietaryRestrictionsDetail}.` : '',
      'Cuando respondas sobre cantidades, proteínas o calorías, usa los datos específicos del usuario.',
      'No des consejos médicos. Si preguntan sobre enfermedades, recomienda consultar un médico o nutricionista.',
    ].filter(Boolean).join('\n');

    // Construye el historial + mensaje actual
    const messages: ChatMessage[] = [
      ...history.slice(-10), // últimos 10 mensajes para no exceder tokens
      { role: 'user', content: message },
    ];

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 400,
          system: systemPrompt,
          messages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Error Anthropic API ${res.status}: ${err}`);
        return { response: this.fallbackResponse(message) };
      }

      const data = await res.json() as any;
      const text = data.content?.[0]?.text;

      if (!text) {
        this.logger.error('Respuesta vacía de Anthropic:', JSON.stringify(data));
        return { response: this.fallbackResponse(message) };
      }

      return { response: text };
    } catch (err) {
      this.logger.error('Error llamando a Anthropic:', err.message);
      return { response: this.fallbackResponse(message) };
    }
  }

  private fallbackResponse(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('proteína') || msg.includes('proteina'))
      return 'Los alimentos más ricos en proteínas son: pollo a la plancha (31g/100g), atún en agua (25g/100g), huevo entero (13g/100g), yogur griego (10g/100g). 💪';
    if (msg.includes('pollo'))
      return 'Puedes reemplazar el pollo por: atún en agua, salmón, huevos, o lentejas si prefieres opciones vegetales. 🐟';
    if (msg.includes('arroz'))
      return 'El arroz puede reemplazarse por: papa cocida, pasta, quinua o avena. 🥗';
    if (msg.includes('perder peso') || msg.includes('bajar'))
      return 'Para perder peso: crea un déficit calórico de 300-500 kcal/día, aumenta proteínas y prioriza alimentos integrales. 🎯';
    if (msg.includes('músculo') || msg.includes('ganar masa'))
      return 'Para ganar masa muscular: consume un superávit de 200-300 kcal y prioriza proteínas (1.6-2.2g por kg de peso). 💪';
    return '¿En qué te puedo ayudar? Puedo orientarte sobre nutrición, reemplazo de alimentos, macros y más.';
  }
}
