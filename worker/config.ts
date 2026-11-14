/**
 * Configuração central do Worker (modelos de Workers AI e estratégia de imagens).
 */

export type ImageStorageMode = 'r2' | 'thumbnail';

/**
 * Define onde os comprovantes enviados pelos usuários serão armazenados:
 * - "r2": envia a imagem original para o bucket privado Cloudflare R2 (recomendado em produção).
 * - "thumbnail": armazena apenas uma miniatura comprimida em base64 (máx. 60 KB) no D1,
 *   útil quando a conta ainda não tem o R2 ativado.
 */
export const IMAGE_STORAGE: ImageStorageMode = 'r2';

/** Limite máximo de tamanho da miniatura em bytes quando IMAGE_STORAGE === "thumbnail". */
export const MAX_THUMBNAIL_BYTES = 60 * 1024;

/** Fuso horário padrão para cálculos de datas e resumos mensais. */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Modelos do Cloudflare Workers AI usados nas próximas etapas.
 * Centralizados aqui para facilitar a troca caso deseje testar outro modelo disponível.
 */
export const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
export const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
export const STT_MODEL = '@cf/openai/whisper-large-v3-turbo';
