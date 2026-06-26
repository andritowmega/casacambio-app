import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface Props {
  label: string
  value: string
  onChange: (date: string) => void
}

export function DatePickerField({ label, value, onChange }: Props) {
  const [visible, setVisible] = useState(false)

  const parsed = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const now = new Date()
  const defaultYear = now.getFullYear() - 25

  const [year, setYear] = useState(parsed ? parseInt(parsed[1]) : defaultYear)
  const [month, setMonth] = useState(parsed ? parseInt(parsed[2]) - 1 : 0)
  const [day, setDay] = useState(parsed ? parseInt(parsed[3]) : 1)

  const maxYear = now.getFullYear() - 18
  const minYear = 1920
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function confirm() {
    const safeDay = Math.min(day, daysInMonth)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
    onChange(dateStr)
    setVisible(false)
  }

  function open() {
    if (parsed) {
      setYear(parseInt(parsed[1]))
      setMonth(parseInt(parsed[2]) - 1)
      setDay(parseInt(parsed[3]))
    }
    setVisible(true)
  }

  const displayDate = parsed
    ? `${parsed[3]}/${parsed[2]}/${parsed[1]}`
    : 'Seleccionar fecha'

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.trigger} onPress={open}>
        <Text style={[s.triggerText, !value && s.placeholder]}>{displayDate}</Text>
        <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.title}>Fecha de nacimiento</Text>

            <View style={s.pickerRow}>
              <PickerCol
                label="Día"
                items={days.map(d => ({ key: d, label: String(d).padStart(2, '0') }))}
                selected={day}
                onSelect={setDay}
              />
              <PickerCol
                label="Mes"
                items={MONTHS.map((m, i) => ({ key: i, label: m }))}
                selected={month}
                onSelect={setMonth}
              />
              <PickerCol
                label="Año"
                items={years.map(y => ({ key: y, label: String(y) }))}
                selected={year}
                onSelect={setYear}
              />
            </View>

            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
                <Text style={s.confirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

function PickerCol({ label, items, selected, onSelect }: {
  label: string
  items: { key: number; label: string }[]
  selected: number
  onSelect: (v: number) => void
}) {
  return (
    <View style={s.col}>
      <Text style={s.colLabel}>{label}</Text>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {items.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[s.item, selected === item.key && s.itemActive]}
            onPress={() => onSelect(item.key)}
          >
            <Text style={[s.itemText, selected === item.key && s.itemTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  trigger: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, backgroundColor: '#fff',
  },
  triggerText: { fontSize: 15, color: '#111827' },
  placeholder: { color: '#9ca3af' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 },
  pickerRow: { flexDirection: 'row', gap: 8, height: 200 },
  col: { flex: 1 },
  colLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textAlign: 'center', marginBottom: 6, textTransform: 'uppercase' },
  scroll: { flex: 1 },
  item: { padding: 10, borderRadius: 8, alignItems: 'center' },
  itemActive: { backgroundColor: '#eff6ff' },
  itemText: { fontSize: 14, color: '#374151' },
  itemTextActive: { color: '#1a3c6e', fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 13, borderRadius: 8, backgroundColor: '#1a3c6e', alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '600' },
})
