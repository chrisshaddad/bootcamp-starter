export const chatSourceSchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    id: { type: 'string' },
    title: { type: 'string' },
  },
  required: ['type', 'id', 'title'],
};

export const chatMessageResponseSwaggerSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    sources: {
      type: 'array',
      items: chatSourceSchema,
    },
  },
  required: ['reply'],
};

export const chatMessageRequestSwaggerSchema = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'How many active members do we have?' },
  },
  required: ['message'],
};
