"use client"

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast-context'

interface Template {
  id: number
  name: string
  description: string
  fields: string[]
  file_path: string
}

interface TemplateSelectProps {
  onSelect: (template: Template | null) => void
  selectedId?: number
}

export function TemplateSelect({ onSelect, selectedId }: TemplateSelectProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await api.getTemplates()
        setTemplates(data)
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to load templates',
          variant: 'destructive'
        })
        console.error('Error loading templates:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const handleSelect = (value: string) => {
    if (value === "none") {
      onSelect(null)
      return
    }

    const selectedTemplate = templates.find(t => t.id === parseInt(value, 10))
    if (selectedTemplate) {
      onSelect(selectedTemplate)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading templates...</div>
  }

  return (
    <div className="space-y-2">
      <Label>Select Template</Label>
      <Select
        value={selectedId?.toString() || "none"}
        onValueChange={handleSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No template (Generate from scratch)</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id.toString()}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedId && templates.find(t => t.id === selectedId)?.description && (
        <p className="text-sm text-muted-foreground">
          {templates.find(t => t.id === selectedId)?.description}
        </p>
      )}
    </div>
  )
} 