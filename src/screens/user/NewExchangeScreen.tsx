import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, AppState, Modal,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { UserStackParams } from '@/navigation/UserNavigator'
import { Ionicons } from '@expo/vector-icons'
import { systemApi } from '@/api/system'
import { userApi } from '@/api/user'
import { catalogApi } from '@/api/catalog'
import { exchangesApi } from '@/api/exchanges'
import { useAuthStore } from '@/store/auth.store'
import { useExchangeStore } from '@/store/exchange.store'
import { startExchangePolling } from '@/services/exchange-poll.service'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 'success'

const EXCHANGE_TIMEOUT_SECS = 15 * 60

const FUND_SOURCES = [
  { value: 'sueldo', label: 'Sueldo / ingresos laborales' },
  { value: 'honorarios', label: 'Honorarios profesionales / independiente' },
  { value: 'negocio', label: 'Negocio propio / ventas comerciales' },
  { value: 'ahorros', label: 'Ahorros personales' },
  { value: 'remesas', label: 'Remesas del extranjero' },
  { value: 'venta_bienes', label: 'Venta de bienes (auto, inmueble, etc.)' },
  { value: 'alquiler', label: 'Alquiler de propiedades' },
  { value: 'inversiones', label: 'Inversiones (acciones, criptomonedas, etc.)' },
  { value: 'prestamo', label: 'Préstamo recibido' },
  { value: 'herencia', label: 'Herencia / donación' },
  { value: 'jubilacion', label: 'Jubilación / pensión' },
  { value: 'indemnizacion', label: 'Indemnización / seguro' },
  { value: 'agricola', label: 'Actividades agrícolas / ganaderas' },
  { value: 'premios', label: 'Premios / sorteos' },
  { value: 'otro', label: 'Otro (especificar)' },
]

const FUND_DESTS = [
  { value: 'ahorro', label: 'Ahorro personal' },
  { value: 'servicios', label: 'Pago de servicios' },
  { value: 'deudas', label: 'Pago de deudas / préstamos' },
  { value: 'compra_bienes', label: 'Compra de bienes (electrodomésticos, auto, etc.)' },
  { value: 'compra_inmueble', label: 'Compra de inmueble' },
  { value: 'inversion', label: 'Inversión (negocios, bolsa, criptomonedas)' },
  { value: 'viajes', label: 'Viajes' },
  { value: 'educacion', label: 'Educación' },
  { value: 'medicos', label: 'Gastos médicos' },
  { value: 'envio_exterior', label: 'Envío de dinero al extranjero' },
  { value: 'capital_trabajo', label: 'Capital de trabajo (negocio)' },
  { value: 'importaciones', label: 'Importaciones / exportaciones' },
  { value: 'proveedores', label: 'Pago a proveedores' },
  { value: 'consumo', label: 'Consumo personal' },
  { value: 'otro', label: 'Otro (especificar)' },
]

const STEP_TITLES: Record<number, string> = {
  1: 'Tipo de cambio',
  2: 'Origen de fondos',
  3: 'Cuenta de BostonDolar',
  4: 'Destino de fondos',
  5: 'Tu cuenta destino',
  6: 'Confirmar operación',
}

function formatCountdown(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function NewExchangeScreen() {
  const navigation = useNavigation<StackNavigationProp<UserStackParams>>()
  const { user } = useAuthStore()
  const { exchangeStartTime, setExchangeStartTime } = useExchangeStore()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  const [rate, setRate] = useState<{ buying: number; selling: number } | null>(null)
  const [config, setConfig] = useState<{ minimun: number; maximun: number } | null>(null)
  const [hasDocs, setHasDocs] = useState(false)

  // Step 1 — amounts + coupon
  const [exchangetype, setExchangetype] = useState<1 | 2>(1)
  const [amountsent, setAmountsent] = useState('')
  const [amountreceived, setAmountreceived] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Step 2 — fund source
  const [fundSource, setFundSource] = useState('')
  const [fundSourceOther, setFundSourceOther] = useState('')

  // Step 3 — company account
  const [companyAccounts, setCompanyAccounts] = useState<any[]>([])
  const [companyAccountId, setCompanyAccountId] = useState<number | null>(null)

  // Step 4 — fund destination
  const [fundDest, setFundDest] = useState('')
  const [fundDestOther, setFundDestOther] = useState('')

  // Step 5 — user account
  const [accounts, setAccounts] = useState<any[]>([])
  const [receivingAccountId, setReceivingAccountId] = useState<number | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)

  // Step 6 — operation id
  const [operationId, setOperationId] = useState('')

  // 15-min countdown
  const [remainingSeconds, setRemainingSeconds] = useState(EXCHANGE_TIMEOUT_SECS)
  const isExpiredRef = useRef(false)

  // Initial load (config once, rate/docs refreshed on focus)
  useEffect(() => {
    systemApi.getConfig()
      .then(res => setConfig(res.data.data))
      .catch(() => {})
  }, [])

  // Set exchange start time once per exchange session
  useEffect(() => {
    setExchangeStartTime(Date.now())
    return () => { setExchangeStartTime(null) }
  }, [])

  // Refresh rate + hasDocs every time screen comes into focus
  useFocusEffect(useCallback(() => {
    Promise.all([systemApi.getExchangeRate(), userApi.getDocuments()])
      .then(([rateRes, docsRes]) => {
        setRate(rateRes.data.data)
        const docs = docsRes.data.data?.documentphotos
        setHasDocs(!!(docs?.front || docs?.back))
      })
      .catch(() => {})
  }, []))

  // Countdown tick — recalculated from start time each second
  useEffect(() => {
    if (!exchangeStartTime) return
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - exchangeStartTime) / 1000)
      const remaining = Math.max(0, EXCHANGE_TIMEOUT_SECS - elapsed)
      setRemainingSeconds(remaining)
      if (remaining === 0 && !isExpiredRef.current) {
        isExpiredRef.current = true
        clearInterval(tick)
        Alert.alert(
          'Tiempo agotado',
          'El tiempo para completar la operación (15 min) ha expirado.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        )
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [exchangeStartTime])

  // Recalculate when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && exchangeStartTime) {
        const elapsed = Math.floor((Date.now() - exchangeStartTime) / 1000)
        setRemainingSeconds(Math.max(0, EXCHANGE_TIMEOUT_SECS - elapsed))
      }
    })
    return () => sub.remove()
  }, [exchangeStartTime])

  const sentCurrency = exchangetype === 1 ? 'USD' : 'PEN'
  const receivedCurrency = exchangetype === 1 ? 'PEN' : 'USD'

  function effectiveRate(c = coupon) {
    if (!rate) return rate
    if (!c) return rate
    const { applyto, points } = c
    return {
      buying: applyto === '0' || applyto === '1' ? rate.buying + points : rate.buying,
      selling: applyto === '0' || applyto === '2' ? rate.selling - points : rate.selling,
    }
  }

  function calcReceived(sent: string, type: 1 | 2, c = coupon) {
    const r = effectiveRate(c)
    if (!r || !sent) return ''
    const n = parseFloat(sent)
    if (isNaN(n) || n <= 0) return ''
    return type === 1 ? (n * r.buying).toFixed(2) : (n / r.selling).toFixed(2)
  }

  function calcSent(received: string, type: 1 | 2, c = coupon) {
    const r = effectiveRate(c)
    if (!r || !received) return ''
    const n = parseFloat(received)
    if (isNaN(n) || n <= 0) return ''
    return type === 1 ? (n / r.buying).toFixed(2) : (n * r.selling).toFixed(2)
  }

  function onChangeSent(value: string) {
    setAmountsent(value)
    setAmountreceived(calcReceived(value, exchangetype))
  }

  function onChangeReceived(value: string) {
    setAmountreceived(value)
    setAmountsent(calcSent(value, exchangetype))
  }

  function changeType(type: 1 | 2) {
    setExchangetype(type)
    setAmountsent('')
    setAmountreceived('')
    setCoupon(null)
    setCouponCode('')
    setCouponError('')
  }

  async function verifyCoupon() {
    if (!couponCode.trim()) return
    try {
      setCouponLoading(true)
      setCouponError('')
      const res = await exchangesApi.verifyCoupon(couponCode.trim())
      const c = res.data.data
      setCoupon(c)
      if (amountsent) setAmountreceived(calcReceived(amountsent, exchangetype, c))
    } catch (e: any) {
      setCouponError(e.msg ?? 'Cupón inválido o agotado')
      setCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setCoupon(null)
    setCouponCode('')
    setCouponError('')
    if (amountsent) setAmountreceived(calcReceived(amountsent, exchangetype, null))
  }

  async function goToStep2() {
    const amount = parseFloat(amountsent)
    if (!amount || isNaN(amount) || amount <= 0) return Alert.alert('Ingresa un monto válido')
    const r = effectiveRate()
    const usdEquiv = exchangetype === 1 ? amount : (r ? amount / r.selling : 0)
    if (config && config.minimun > 0 && usdEquiv < config.minimun) {
      return Alert.alert('Monto mínimo', `El monto mínimo de operación es $${config.minimun.toFixed(2)} USD.`)
    }
    if (config && config.maximun > 0 && usdEquiv >= config.maximun && !hasDocs) {
      return Alert.alert(
        'Verificación requerida',
        `Para operar montos de $${config.maximun.toFixed(2)} USD o más necesitas verificar tu identidad. Sube tus documentos primero.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Subir documentos', onPress: () => navigation.navigate('Documents') },
        ]
      )
    }
    setStep(2)
  }

  async function goToStep3() {
    if (!fundSource) return Alert.alert('Selecciona el origen de tus fondos')
    if (fundSource === 'otro' && !fundSourceOther.trim()) return Alert.alert('Especifica el origen de tus fondos')
    try {
      setLoading(true)
      const res = await systemApi.getCompanyAccounts('0')
      const all = res.data.data ?? []
      const companyCurrency = sentCurrency === 'USD' ? '2' : '1'
      setCompanyAccounts(all.filter((a: any) => String(a.currency) === companyCurrency))
      setStep(3)
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? e.message ?? 'No se pudieron cargar las cuentas')
    } finally {
      setLoading(false)
    }
  }

  function goToStep4() {
    if (!companyAccountId) return Alert.alert('Selecciona una cuenta de BostonDolar')
    setStep(4)
  }

  async function goToStep5() {
    if (!fundDest) return Alert.alert('Selecciona el destino de tus fondos')
    if (fundDest === 'otro' && !fundDestOther.trim()) return Alert.alert('Especifica el destino de tus fondos')
    try {
      setLoading(true)
      const currencyId = receivedCurrency === 'USD' ? '1' : '2'
      const res = await userApi.getAccounts(currencyId)
      setAccounts(res.data.data ?? [])
      setStep(5)
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? e.message ?? 'No se pudieron cargar tus cuentas')
    } finally {
      setLoading(false)
    }
  }

  async function reloadAccounts() {
    try {
      const currencyId = receivedCurrency === 'USD' ? '1' : '2'
      const res = await userApi.getAccounts(currencyId)
      setAccounts(res.data.data ?? [])
    } catch {}
  }

  function goToStep6() {
    if (!receivingAccountId) return Alert.alert('Selecciona una cuenta destino')
    setStep(6)
  }

  async function confirmExchange() {
    if (!operationId.trim()) return Alert.alert('Ingresa el número de operación')
    if (!receivingAccountId || !companyAccountId) return
    try {
      setLoading(true)
      const res = await exchangesApi.create({
        profileId: user?.idprofile,
        amountsent: parseFloat(amountsent),
        exchangetype,
        receivingAccountId,
        companyAccountId,
        operationId: operationId.trim(),
        typeoffer: coupon ? '3' : '0',
        offerId: coupon?.idcoupon ?? null,
        fundSource,
        fundSourceOther: fundSource === 'otro' ? fundSourceOther.trim() : null,
        fundDest,
        fundDestOther: fundDest === 'otro' ? fundDestOther.trim() : null,
      })
      if (coupon) {
        await exchangesApi.markCouponUsed(user!.iduser, coupon.idcoupon).catch(() => {})
      }
      const created = res.data.data
      useExchangeStore.getState().setLastExchange({
        idexchange: created.idexchange,
        amountsent: parseFloat(amountsent),
        exchangetype,
        statusexchange: 1,
      })
      startExchangePolling(created.idexchange)
      setExchangeStartTime(null)
      setStep('success')
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? e.message ?? 'No se pudo crear la operación')
    } finally {
      setLoading(false)
    }
  }

  function goBack() {
    if (step === 1 || step === 'success') {
      navigation.goBack()
    } else {
      setStep((step as number - 1) as Step)
    }
  }

  const er = effectiveRate()
  const displayRate = er
    ? (exchangetype === 1 ? er.buying : er.selling).toFixed(3)
    : null

  const isUrgent = remainingSeconds <= 120
  const countdownColor = isUrgent ? '#ef4444' : '#93c5fd'

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <ExchangeStatusScreen
        sentCurrency={sentCurrency}
        receivedCurrency={receivedCurrency}
        amountsent={amountsent}
        amountreceived={amountreceived}
        onGoBack={() => navigation.goBack()}
      />
    )
  }

  const stepNum = step as number

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{STEP_TITLES[stepNum]}</Text>
          <View style={styles.stepsRow}>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  stepNum === s && styles.stepDotActive,
                  stepNum > s && styles.stepDotDone,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.stepIndicator}>{stepNum}/6</Text>
          <Text style={[styles.countdown, { color: countdownColor }]}>
            {formatCountdown(remainingSeconds)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >

        {/* ── STEP 1: Tipo + Montos + Cupón ─────────────────────────────────── */}
        {step === 1 && (
          <View>
            <Text style={styles.label}>¿Qué quieres cambiar?</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeCard, exchangetype === 1 && styles.typeCardActive]}
                onPress={() => changeType(1)}
              >
                <Text style={styles.typeFlag}>🇺🇸</Text>
                <Text style={[styles.typeLabel, exchangetype === 1 && styles.typeLabelActive]}>USD → PEN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeCard, exchangetype === 2 && styles.typeCardActive]}
                onPress={() => changeType(2)}
              >
                <Text style={styles.typeFlag}>🇵🇪</Text>
                <Text style={[styles.typeLabel, exchangetype === 2 && styles.typeLabelActive]}>PEN → USD</Text>
              </TouchableOpacity>
            </View>

            {rate && (
              <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>
                  Tipo de cambio: {exchangetype === 1 ? `1 USD = S/ ${displayRate}` : `S/ ${displayRate} = 1 USD`}
                  {coupon ? '  ✓ cupón aplicado' : ''}
                </Text>
              </View>
            )}

            <View style={styles.amountRow}>
              <View style={styles.amountField}>
                <Text style={styles.amountCurrency}>{sentCurrency}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder={`Mín: ${config?.minimun ?? '...'}`}
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={amountsent}
                  onChangeText={onChangeSent}
                />
                <Text style={styles.amountHint}>Envías</Text>
              </View>
              <View style={styles.amountArrow}>
                <Ionicons name="swap-horizontal" size={22} color="#1a3c6e" />
              </View>
              <View style={styles.amountField}>
                <Text style={styles.amountCurrency}>{receivedCurrency}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={amountreceived}
                  onChangeText={onChangeReceived}
                />
                <Text style={styles.amountHint}>Recibes</Text>
              </View>
            </View>

            <Text style={styles.label}>Cupón de descuento (opcional)</Text>
            {coupon ? (
              <>
                <View style={styles.couponApplied}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.couponAppliedText}>
                      {coupon.identifier ?? couponCode} · +{coupon.points} pts
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removeCoupon}>
                    <Text style={styles.couponRemove}>Quitar</Text>
                  </TouchableOpacity>
                </View>
                {(() => {
                  if (!amountsent) return null
                  const withC = parseFloat(calcReceived(amountsent, exchangetype, coupon))
                  const withoutC = parseFloat(calcReceived(amountsent, exchangetype, null))
                  if (isNaN(withC) || isNaN(withoutC) || withC <= withoutC) return null
                  return (
                    <Text style={styles.gainText}>
                      Ganas {receivedCurrency} {(withC - withoutC).toFixed(2)} extra con este cupón
                    </Text>
                  )
                })()}
              </>
            ) : (
              <View style={styles.couponRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Ej: PROMO10"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={(t) => { setCouponCode(t.replace(/\s/g, '').toUpperCase()); setCouponError('') }}
                />
                <TouchableOpacity style={styles.couponBtn} onPress={verifyCoupon} disabled={couponLoading}>
                  {couponLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.couponBtnText}>Aplicar</Text>}
                </TouchableOpacity>
              </View>
            )}
            {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}

            <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={goToStep2}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Origen de fondos ──────────────────────────────────────── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepHint}>¿De dónde proviene el dinero que vas a cambiar?</Text>
            {FUND_SOURCES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionCard, fundSource === opt.value && styles.optionCardActive]}
                onPress={() => setFundSource(opt.value)}
              >
                <View style={styles.radioRow}>
                  <View style={[styles.radio, fundSource === opt.value && styles.radioActive]}>
                    {fundSource === opt.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionLabel, fundSource === opt.value && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {fundSource === 'otro' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Especifica el origen de tus fondos"
                placeholderTextColor="#9ca3af"
                value={fundSourceOther}
                onChangeText={setFundSourceOther}
              />
            )}
            <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={goToStep3} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: Cuenta de BostonDolar ────────────────────────────────── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepHint}>
              Deposita en esta cuenta de BostonDolar ({sentCurrency})
            </Text>
            {companyAccounts.length === 0 && (
              <Text style={styles.emptyText}>No hay cuentas disponibles en este momento.</Text>
            )}
            {companyAccounts.map((acc) => (
              <TouchableOpacity
                key={acc.idcompanyaccount}
                style={[styles.optionCard, companyAccountId === acc.idcompanyaccount && styles.optionCardActive]}
                onPress={() => setCompanyAccountId(acc.idcompanyaccount)}
              >
                <Text style={styles.optionTitle}>{acc.accountnamecompany}</Text>
                <Text style={styles.optionSub}>
                  {acc.accountnumbercompany}
                  {acc.bankname ? ` · ${acc.bankname}` : ''}
                </Text>
                <Text style={styles.optionNote}>Razón social: Grupo Empresarial Boston S.A.C.</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.button} onPress={goToStep4}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 4: Destino de fondos ─────────────────────────────────────── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepHint}>¿Para qué usarás el dinero que recibirás?</Text>
            {FUND_DESTS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionCard, fundDest === opt.value && styles.optionCardActive]}
                onPress={() => setFundDest(opt.value)}
              >
                <View style={styles.radioRow}>
                  <View style={[styles.radio, fundDest === opt.value && styles.radioActive]}>
                    {fundDest === opt.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionLabel, fundDest === opt.value && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {fundDest === 'otro' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Especifica el destino de tus fondos"
                placeholderTextColor="#9ca3af"
                value={fundDestOther}
                onChangeText={setFundDestOther}
              />
            )}
            <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={goToStep5} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 5: Tu cuenta destino ─────────────────────────────────────── */}
        {step === 5 && (
          <View>
            <View style={styles.step5Header}>
              <Text style={styles.stepHint}>
                Selecciona tu cuenta en {receivedCurrency} donde recibirás el dinero
              </Text>
              <TouchableOpacity style={styles.addAccountBtn} onPress={() => setShowAddAccount(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addAccountBtnText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {accounts.length === 0 && (
              <Text style={styles.emptyText}>
                No tienes cuentas en {receivedCurrency}.{'\n'}
                Agrega una con el botón de arriba para continuar.
              </Text>
            )}
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.idbankaccountuser}
                style={[styles.optionCard, receivingAccountId === acc.idbankaccountuser && styles.optionCardActive]}
                onPress={() => setReceivingAccountId(acc.idbankaccountuser)}
              >
                <Text style={styles.optionTitle}>{acc.accountnameuser}</Text>
                <Text style={styles.optionSub}>
                  {acc.accountnumberuser}{acc.bankname ? ` · ${acc.bankname}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.button, accounts.length === 0 && styles.buttonDisabled]}
              onPress={goToStep6}
              disabled={accounts.length === 0}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 6: Confirmar ─────────────────────────────────────────────── */}
        {step === 6 && (
          <View>
            <Text style={styles.label}>Resumen</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Tipo" value={exchangetype === 1 ? 'USD → PEN' : 'PEN → USD'} />
              <SummaryRow label={`Envías (${sentCurrency})`} value={parseFloat(amountsent).toFixed(2)} />
              <SummaryRow label={`Recibirás (${receivedCurrency})`} value={parseFloat(amountreceived || '0').toFixed(2)} />
              {coupon && <SummaryRow label="Cupón" value={`+${coupon.points} pts`} highlight />}
              <SummaryRow label="Origen fondos" value={FUND_SOURCES.find(f => f.value === fundSource)?.label ?? fundSource} />
              <SummaryRow label="Destino fondos" value={FUND_DESTS.find(f => f.value === fundDest)?.label ?? fundDest} />
            </View>

            {(() => {
              const acc = companyAccounts.find(a => a.idcompanyaccount === companyAccountId)
              if (!acc) return null
              return (
                <>
                  <Text style={styles.label}>Deposita en esta cuenta</Text>
                  <View style={styles.depositCard}>
                    <Text style={styles.depositBank}>{acc.bankname ?? acc.accountnamecompany}</Text>
                    <Text style={styles.depositName}>{acc.accountnamecompany}</Text>
                    <Text style={styles.depositNumber}>{acc.accountnumbercompany}</Text>
                    <Text style={styles.depositRazon}>Razón social: Grupo Empresarial Boston S.A.C.</Text>
                  </View>
                </>
              )
            })()}

            <Text style={styles.label}>N° de operación bancaria</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de tu transferencia"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={operationId}
              onChangeText={setOperationId}
            />
            <Text style={styles.hint}>
              Ingresa el número de operación que te dio tu banco al realizar la transferencia.
            </Text>

            <TouchableOpacity style={styles.button} onPress={confirmExchange} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirmar operación</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ── Modal agregar cuenta (Step 5) ────────────────────────────────────── */}
      <AddAccountModal
        visible={showAddAccount}
        currencyType={receivedCurrency === 'USD' ? 1 : 2}
        onClose={() => setShowAddAccount(false)}
        onSaved={async () => {
          setShowAddAccount(false)
          await reloadAccounts()
        }}
      />
    </KeyboardAvoidingView>
  )
}

// ── AddAccountModal ───────────────────────────────────────────────────────────

type TransferType = 'D' | 'I'
const CURRENCIES = [{ value: 2, label: 'PEN' }, { value: 1, label: 'USD' }]

function AddAccountModal({ visible, currencyType, onClose, onSaved }: {
  visible: boolean
  currencyType: 1 | 2
  onClose: () => void
  onSaved: () => void
}) {
  const [banks, setBanks] = useState<any[]>([])
  const [interbanks, setInterbanks] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [transferType, setTransferType] = useState<TransferType | null>(null)
  const [accountnameuser, setAccountnameuser] = useState('')
  const [accountnumberuser, setAccountnumberuser] = useState('')
  const [currency, setCurrency] = useState<1 | 2>(currencyType)
  const [selectedBank, setSelectedBank] = useState<number | null>(null)

  useEffect(() => {
    if (!visible) return
    setCurrency(currencyType)
    setTransferType(null)
    setAccountnameuser('')
    setAccountnumberuser('')
    setSelectedBank(null)
    Promise.all([catalogApi.getBanks(), catalogApi.getInterbanks()])
      .then(([bRes, iRes]) => {
        setBanks(bRes.data.data ?? [])
        setInterbanks(iRes.data.data ?? [])
      })
      .catch(() => {})
  }, [visible])

  async function handleSave() {
    if (!accountnameuser.trim()) return Alert.alert('Ingresa el nombre del titular')
    if (!accountnumberuser.trim()) return Alert.alert('Ingresa el número de cuenta')
    if (!selectedBank) return Alert.alert('Selecciona un banco')
    try {
      setSaving(true)
      await userApi.createAccount({
        accountnameuser: accountnameuser.trim(),
        accountnumberuser: accountnumberuser.trim(),
        currencytype: currency,
        idassociatedbankuser: selectedBank,
        bankaccounttype: transferType,
      })
      Alert.alert('¡Listo!', 'Cuenta agregada correctamente', [
        { text: 'OK', onPress: onSaved },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? e.message ?? 'No se pudo guardar la cuenta')
    } finally {
      setSaving(false)
    }
  }

  const bankList = transferType === 'D' ? banks : interbanks

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={transferType ? () => setTransferType(null) : onClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {!transferType ? 'Agregar cuenta' : transferType === 'D' ? 'Transferencia directa' : 'Transferencia interbancaria'}
          </Text>
        </View>

        {!transferType ? (
          <View style={modalStyles.body}>
            <Text style={modalStyles.hint}>Selecciona el tipo de transferencia de tu banco</Text>
            <TouchableOpacity style={modalStyles.typeCard} onPress={() => setTransferType('D')}>
              <Text style={modalStyles.typeTitle}>Transferencia directa</Text>
              <Text style={modalStyles.typeSub}>Tu banco está entre los de la casa de cambio. Se acredita de forma inmediata.</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={modalStyles.typeArrow} />
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.typeCard} onPress={() => setTransferType('I')}>
              <Text style={modalStyles.typeTitle}>Transferencia interbancaria</Text>
              <Text style={modalStyles.typeSub}>Tu banco es distinto al de la casa de cambio. Usa CCI.</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={modalStyles.typeArrow} />
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={modalStyles.fieldLabel}>Moneda</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {CURRENCIES.map(c => (
                <ModalChip key={c.value} label={c.label} active={currency === c.value} onPress={() => setCurrency(c.value as 1 | 2)} />
              ))}
            </View>

            <Text style={modalStyles.fieldLabel}>Nombre del titular</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor="#9ca3af"
              value={accountnameuser}
              onChangeText={setAccountnameuser}
            />

            <Text style={modalStyles.fieldLabel}>Banco</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {bankList.map(b => (
                <ModalChip key={b.idcatalog} label={b.value} active={selectedBank === b.idcatalog} onPress={() => setSelectedBank(b.idcatalog)} />
              ))}
            </ScrollView>

            <Text style={modalStyles.fieldLabel}>{transferType === 'I' ? 'Número de cuenta (CCI)' : 'Número de cuenta'}</Text>
            <TextInput
              style={modalStyles.input}
              placeholder={transferType === 'I' ? 'CCI (20 dígitos)' : 'Número de cuenta'}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={accountnumberuser}
              onChangeText={setAccountnumberuser}
            />

            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar cuenta</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ModalChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8,
        borderWidth: 1.5, borderColor: active ? '#1a3c6e' : '#d1d5db',
        backgroundColor: active ? '#eff6ff' : '#fff',
      }}
    >
      <Text style={{ fontSize: 13, color: active ? '#1a3c6e' : '#6b7280', fontWeight: active ? '600' : '400' }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const modalStyles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  typeCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  typeTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  typeSub: { fontSize: 13, color: '#6b7280', lineHeight: 19 },
  typeArrow: { position: 'absolute', right: 16, top: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15, backgroundColor: '#fff', color: '#111827',
  },
})

// ── ExchangeStatusScreen ──────────────────────────────────────────────────────

const POLL_INTERVAL_VIS = 10

function ExchangeStatusScreen({
  sentCurrency, receivedCurrency, amountsent, amountreceived, onGoBack,
}: {
  sentCurrency: string; receivedCurrency: string
  amountsent: string; amountreceived: string; onGoBack: () => void
}) {
  const liveExchange = useExchangeStore(state => state.lastExchange)
  const [countdown, setCountdown] = useState(POLL_INTERVAL_VIS)
  const isTerminalRef = useRef(false)

  const status = Number(liveExchange?.statusexchange ?? 1)
  const comment = liveExchange?.operationcomment
  const isTerminal = status === 3 || status === 4
  isTerminalRef.current = isTerminal

  useEffect(() => {
    if (isTerminal) return
    const t = setInterval(() => setCountdown(p => (p <= 1 ? POLL_INTERVAL_VIS : p - 1)), 1000)
    return () => clearInterval(t)
  }, [isTerminal])

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && !isTerminalRef.current) setCountdown(POLL_INTERVAL_VIS)
    })
    return () => sub.remove()
  }, [])

  const STEPS = [
    { key: 1, label: 'Pendiente' },
    { key: 2, label: status === 4 ? 'Cancelado' : 'Completado' },
  ]

  return (
    <View style={styles.container}>
      <View style={[styles.header, { justifyContent: 'center' }]}>
        <Text style={styles.headerTitle}>Estado de tu operación</Text>
      </View>
      <ScrollView contentContainerStyle={stSt.body}>
        <Ionicons
          name={status === 3 ? 'checkmark-circle' : status === 4 ? 'close-circle' : 'time-outline'}
          size={72}
          color={status === 3 ? '#10b981' : status === 4 ? '#ef4444' : '#1a3c6e'}
        />
        <Text style={stSt.title}>
          {status === 3 ? '¡Operación completada!'
            : status === 4 ? 'Operación cancelada'
            : 'Pendiente de procesamiento'}
        </Text>
        {comment ? <Text style={stSt.comment}>{comment}</Text> : null}

        <View style={stSt.stepsRow}>
          {STEPS.map((s, i) => {
            const done = s.key === 1 || (s.key === 2 && isTerminal)
            const cancelled = status === 4 && s.key === 2
            return (
              <React.Fragment key={s.key}>
                <View style={stSt.stepItem}>
                  <View style={[
                    stSt.circle,
                    done && !cancelled && stSt.circleDone,
                    done && cancelled && stSt.circleCancelled,
                  ]}>
                    {done
                      ? <Ionicons name={cancelled ? 'close' : 'checkmark'} size={16} color="#fff" />
                      : <Text style={stSt.circleNum}>{s.key}</Text>}
                  </View>
                  <Text style={[stSt.stepLabel, done && stSt.stepLabelOn]}>
                    {s.label}
                  </Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[stSt.line, isTerminal && stSt.lineDone]} />
                )}
              </React.Fragment>
            )
          })}
        </View>

        <View style={stSt.card}>
          <View style={stSt.cardRow}>
            <Text style={stSt.cardLabel}>Envías</Text>
            <Text style={stSt.cardValue}>{sentCurrency} {parseFloat(amountsent).toFixed(2)}</Text>
          </View>
          <View style={stSt.cardRow}>
            <Text style={stSt.cardLabel}>Recibirás</Text>
            <Text style={stSt.cardValue}>{receivedCurrency} {parseFloat(amountreceived || '0').toFixed(2)}</Text>
          </View>
          {liveExchange?.idexchange ? (
            <Text style={stSt.cardId}>Operación #{liveExchange.idexchange}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={[styles.button, { marginTop: 20, width: '100%' }]} onPress={onGoBack}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const stSt = StyleSheet.create({
  body: { alignItems: 'center', padding: 28, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 16, textAlign: 'center' },
  comment: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  stepsRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 28, width: '100%', paddingHorizontal: 4 },
  stepItem: { alignItems: 'center', width: 80 },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  circleDone: { backgroundColor: '#10b981' },
  circleCancelled: { backgroundColor: '#ef4444' },
  circleNum: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  stepLabel: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  stepLabelOn: { color: '#374151', fontWeight: '500' },
  line: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginTop: 17 },
  lineDone: { backgroundColor: '#10b981' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '100%', borderWidth: 1, borderColor: '#e5e7eb', marginTop: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  cardLabel: { fontSize: 14, color: '#6b7280' },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardId: { fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  countdown: { fontSize: 13, color: '#9ca3af', marginTop: 20 },
})

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={summaryStyles.row}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.value, highlight && summaryStyles.highlight]} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const summaryStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { color: '#6b7280', fontSize: 13, flex: 1 },
  value: { fontWeight: '600', color: '#111827', fontSize: 13, flex: 2, textAlign: 'right' },
  highlight: { color: '#10b981' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a3c6e', padding: 20, paddingTop: 52,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  stepsRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  stepDotActive: { width: 16, backgroundColor: '#fff' },
  stepDotDone: { backgroundColor: 'rgba(255,255,255,0.7)' },
  stepIndicator: { color: '#93c5fd', fontSize: 13 },
  countdown: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  body: { padding: 20, paddingBottom: 120 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 8 },
  stepHint: { fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 19 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15, backgroundColor: '#fff', color: '#111827',
  },
  button: { backgroundColor: '#00b4d8', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  // Step 1
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeCard: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, padding: 16, alignItems: 'center' },
  typeCardActive: { borderColor: '#1a3c6e', backgroundColor: '#eff6ff' },
  typeFlag: { fontSize: 28, marginBottom: 4 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  typeLabelActive: { color: '#1a3c6e' },
  rateBox: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 16 },
  rateLabel: { color: '#1e40af', fontSize: 13, textAlign: 'center' },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16,
  },
  amountField: { flex: 1, alignItems: 'center' },
  amountCurrency: { fontSize: 12, fontWeight: '700', color: '#1a3c6e', marginBottom: 4, letterSpacing: 0.5 },
  amountInput: {
    fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center',
    borderBottomWidth: 1.5, borderBottomColor: '#d1d5db', paddingBottom: 4, minWidth: 100,
  },
  amountHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  amountArrow: { padding: 8 },
  couponRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  couponBtn: { backgroundColor: '#00b4d8', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  couponBtnText: { color: '#fff', fontWeight: '600' },
  couponApplied: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  couponAppliedText: { color: '#15803d', fontSize: 14, fontWeight: '600' },
  couponRemove: { color: '#ef4444', fontSize: 13 },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 4 },
  gainText: { color: '#15803d', fontSize: 13, fontWeight: '500', marginTop: 6, textAlign: 'center' },
  // Steps 2 & 4
  optionCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  optionCardActive: { borderColor: '#1a3c6e', backgroundColor: '#eff6ff' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#1a3c6e' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a3c6e' },
  optionLabel: { fontSize: 14, color: '#374151', flex: 1 },
  optionLabelActive: { color: '#1a3c6e', fontWeight: '600' },
  // Steps 3 & 5
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  optionSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  optionNote: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  emptyText: { color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginVertical: 20 },
  step5Header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  addAccountBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a3c6e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  addAccountBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // Step 6
  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  depositCard: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#bfdbfe',
  },
  depositBank: { fontSize: 13, fontWeight: '700', color: '#1a3c6e', marginBottom: 2 },
  depositName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  depositNumber: { fontSize: 16, fontWeight: 'bold', color: '#1a3c6e', marginTop: 4, letterSpacing: 0.5 },
  depositRazon: { fontSize: 11, color: '#6b7280', marginTop: 6 },
  hint: { fontSize: 12, color: '#9ca3af', lineHeight: 18, marginBottom: 8 },
})
