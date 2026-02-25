"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast-context'

export function TextFormatter() {
  const [text, setText] = useState('')
  const [isFormFilled, setIsFormFilled] = useState(false)

  const handleUpperCase = () => {
    setText(text.toUpperCase())
  }

  const handleLowerCase = () => {
    setText(text.toLowerCase())
  }

  const handleCapitalize = () => {
    setText(
      text
        .split('\n')
        .map(line => 
          line
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        )
        .join('\n')
    )
  }

  const handleClear = () => {
    setText('')
    setIsFormFilled(false)
  }

  const handleFillForm = () => {
    try {
      // Split text into lines
      const lines = text.trim().split('\n')
      
      // Get current date and format it as YYYY-MM-DD
      const currentDate = new Date()
      const formattedCurrentDate = currentDate.toISOString().split('T')[0]
      
      // Calculate expiration date (30 days from current date)
      const expirationDate = new Date(currentDate)
      expirationDate.setDate(currentDate.getDate() + 29)
      const formattedExpirationDate = expirationDate.toISOString().split('T')[0]
      
      // Create form data object
      const formData = {
        first: lines[0] || '',    // First line
        last: lines[1] || '',     // Second line
        address: lines[2] || '',  // Third line
        city: lines[3] || '',     // Fourth line
        state: lines[4] || '',    // Fifth line
        zip: lines[5] || '',      // Sixth line
        // Set current date for date fields
        date1: formattedCurrentDate,
        date2: formattedCurrentDate,
        // Set expiration dates (30 days from current date)
        exp1: formattedExpirationDate,
        exp2: formattedExpirationDate,
        exp3: formattedExpirationDate,
        // Set default insurance info
        ins: 'GEICO',
        policy: '6086177216'
      }

      // Get existing form data if any and merge while preserving VIN data
      const existingData = localStorage.getItem('pdfFormData')
      const mergedData = existingData 
        ? { 
            ...JSON.parse(existingData), 
            ...formData,
            // Preserve any existing VIN data
            vin1: JSON.parse(existingData).vin1 || '',
            vin2: JSON.parse(existingData).vin2 || '',
            vin3: JSON.parse(existingData).vin3 || '',
            make1: JSON.parse(existingData).make1 || '',
            make2: JSON.parse(existingData).make2 || '',
            model1: JSON.parse(existingData).model1 || '',
            model2: JSON.parse(existingData).model2 || '',
            year: JSON.parse(existingData).year || '',
          }
        : formData

      // Store in localStorage
      localStorage.setItem('pdfFormData', JSON.stringify(mergedData))

      // Show success message
      toast({
        title: 'Success',
        description: 'Text has been added to the PDF form',
      })

      // Set form filled state
      setIsFormFilled(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fill form fields',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Formatter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text to format (one item per line):
First Name
Last Name
Address
City
State
ZIP"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setIsFormFilled(false)
          }}
          className="min-h-[200px] font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleUpperCase}>UPPERCASE</Button>
          <Button onClick={handleLowerCase}>lowercase</Button>
          <Button onClick={handleCapitalize}>Capitalize</Button>
          <Button variant="outline" onClick={handleClear}>Clear</Button>
          <Button 
            variant={isFormFilled ? "success" : "secondary"}
            onClick={handleFillForm}
            disabled={!text.trim()}
          >
            {isFormFilled ? 'Form Filled ✓' : 'Fill Form Fields'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 