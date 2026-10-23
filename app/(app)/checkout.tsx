import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormInput } from '@/components/FormInput';
import { Screen } from '@/components/Screen';
import { PAYMENT_METHODS } from '@/constants/catalog';
import { useCart } from '@/context/CartContext';
import { useCreateOrder, useLastAddress } from '@/hooks/useOrders';
import { makeCheckoutSchema } from '@/schemas/checkout';
import type { CheckoutFormData } from '@/schemas/checkout';
import { colors, radius, spacing } from '@/theme';
import { friendlyError } from '@/utils/errors';
import { formatMoney, parseMoney, roundMoney } from '@/utils/money';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, totals, clear } = useCart();
  const create = useCreateOrder();
  const { data: last } = useLastAddress();
  const schema = useMemo(() => makeCheckoutSchema(totals.total), [totals.total]);
  const prefilled = useRef(false);

  const { control, handleSubmit, watch, setValue, reset } = useForm<CheckoutFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      street: '',
      number: '',
      neighborhood: '',
      complement: '',
      payment: 'pix',
      changeFor: '',
    },
  });
  const payment = watch('payment');

  // Preenche com o endereço do último pedido (uma vez só).
  useEffect(() => {
    if (last && !prefilled.current) {
      prefilled.current = true;
      reset({
        street: last.address_street,
        number: last.address_number,
        neighborhood: last.address_neighborhood,
        complement: last.address_complement ?? '',
        payment: 'pix',
        changeFor: '',
      });
    }
  }, [last, reset]);

  // Sem itens não há o que finalizar (mas não redirecione logo após criar o pedido).
  if (cart.items.length === 0 && !create.isSuccess) return <Redirect href="/cart" />;

  const submit = handleSubmit((values) => {
    create.mutate(
      {
        storeId: cart.storeId as string,
        // Só ids e quantidades. Os preços são calculados no banco.
        items: cart.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        payment: values.payment,
        changeFor:
          values.payment === 'cash' && values.changeFor.trim()
            ? roundMoney(parseMoney(values.changeFor))
            : null,
        street: values.street,
        number: values.number,
        neighborhood: values.neighborhood,
        complement: values.complement,
      },
      {
        onSuccess: (orderId) => {
          clear();
          router.replace(`/order/${orderId}`);
        },
        onError: (error) =>
          Alert.alert('Não foi possível fazer o pedido', friendlyError(error)),
      },
    );
  });

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Text style={styles.section}>Endereço de entrega</Text>
      <FormInput
        control={control}
        name="street"
        label="Rua"
        placeholder="Ex.: Rua das Flores"
        autoComplete="street-address"
      />
      <View style={styles.pair}>
        <View style={styles.small}>
          <FormInput control={control} name="number" label="Número" placeholder="120" />
        </View>
        <View style={styles.grow}>
          <FormInput
            control={control}
            name="neighborhood"
            label="Bairro"
            placeholder="Centro"
          />
        </View>
      </View>
      <FormInput
        control={control}
        name="complement"
        label="Complemento (opcional)"
        placeholder="Apto 12, bloco B"
      />

      <Text style={styles.section}>Pagamento</Text>
      {PAYMENT_METHODS.map((method) => {
        const selected = payment === method.value;
        return (
          <Pressable
            key={method.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setValue('payment', method.value)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]} />
            <View>
              <Text style={styles.optionLabel}>{method.label}</Text>
              <Text style={styles.optionHint}>{method.hint}</Text>
            </View>
          </Pressable>
        );
      })}
      {payment === 'cash' ? (
        <FormInput
          control={control}
          name="changeFor"
          label="Troco para quanto? (opcional)"
          placeholder="Ex.: 100,00"
          keyboardType="decimal-pad"
        />
      ) : null}

      <Card style={styles.summary}>
        <Text style={styles.summaryTitle}>Resumo · {cart.storeName}</Text>
        <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal)} />
        <SummaryRow
          label="Entrega"
          value={totals.deliveryFee === 0 ? 'Grátis' : formatMoney(totals.deliveryFee)}
        />
        <SummaryRow label="Total" value={formatMoney(totals.total)} strong />
      </Card>

      <Text style={styles.note}>
        Pagamento simulado neste projeto: nenhum valor é cobrado.
      </Text>
      <Button
        title={`Confirmar pedido · ${formatMoney(totals.total)}`}
        onPress={submit}
        loading={create.isPending}
      />
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  pair: { flexDirection: 'row', gap: spacing.md },
  small: { width: 110 },
  grow: { flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radioSelected: { borderColor: colors.primary, borderWidth: 7 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionHint: { fontSize: 13, color: colors.muted },
  summary: { marginTop: spacing.md },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 15, color: colors.muted },
  rowValue: { fontSize: 15, color: colors.text },
  strong: { fontSize: 18, fontWeight: '800', color: colors.text },
  note: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
