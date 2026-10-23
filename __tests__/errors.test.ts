import { friendlyError } from '@/utils/errors';

// Teste de regressão: cenário 18 do roteiro (modo avião) mostrava a mensagem técnica.
describe('friendlyError', () => {
  it('traduz a falha de rede do expo/fetch (modo avião no iPhone)', () => {
    const error = new Error(
      'fetch failed: The Internet connection appears to be offline.',
    );
    expect(friendlyError(error)).toBe('Sem conexão com a internet.');
  });
});
