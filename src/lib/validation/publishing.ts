export function validatePublishingInput(input: { outputId?: string; platform?: string }) {
  return Boolean(input.outputId && input.platform);
}
