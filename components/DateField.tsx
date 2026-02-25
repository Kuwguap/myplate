import React from 'react'
import { FormField } from './DocumentForm'

interface DateFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  className?: string
  backendField?: string
}

export function DateField(props: DateFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '') // Remove non-digits
    
    // Format as MM/DD/YYYY
    if (value.length >= 4) {
      const month = value.slice(0, 2)
      const day = value.slice(2, 4)
      const year = value.slice(4, 8)
      
      // Validate month
      if (parseInt(month) > 12) value = '12' + value.slice(2)
      // Validate day
      if (parseInt(day) > 31) value = value.slice(0, 2) + '31' + value.slice(4)
      
      // Format with slashes
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}${value.length > 4 ? '/' + value.slice(4, 8) : ''}`
    } else if (value.length >= 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`
    }

    props.onChange(value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value && !isValidDate(value)) {
      props.onChange('')
    }
  }

  return (
    <FormField
      {...props}
      type="text"
      placeholder="MM/DD/YYYY"
      onChange={handleChange}
      onBlur={handleBlur}
      pattern="\d{2}/\d{2}/\d{4}"
    />
  )
}

function isValidDate(dateStr: string): boolean {
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/
  if (!regex.test(dateStr)) return false

  const [month, day, year] = dateStr.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 && date.getDate() === day && date.getFullYear() === year
} 