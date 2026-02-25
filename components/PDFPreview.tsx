"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { TemplateData } from '@/lib/pdf-template'
import debounce from 'lodash/debounce'

interface PDFPreviewProps {
  data: TemplateData
  templateId?: number
  templatePath?: string
  className?: string
}

export function PDFPreview({ data, templateId, templatePath, className }: PDFPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Memoize the data to prevent unnecessary regeneration
  const memoizedData = useMemo(() => data, [JSON.stringify(data)])

  // Create a stable generatePreview function
  const generatePreview = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)

    try {
      const blob = await api.previewPDF({
        data: memoizedData,
        templateId,
        templatePath
      })

      // Clean up old URL if it exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setError(null)
    } catch (error) {
      console.error('Preview generation error:', error)
      setError('Failed to generate preview. Please try again.')
      setPreviewUrl(null)
    } finally {
      setIsGenerating(false)
    }
  }, [memoizedData, templateId, templatePath])

  // Create a debounced version of generatePreview
  const debouncedGeneratePreview = useMemo(
    () => debounce(generatePreview, 1000),
    [generatePreview]
  )

  useEffect(() => {
    // Only generate preview if we have some data
    const hasData = Object.values(memoizedData).some(value => value && value.toString().trim() !== '')
    
    if (hasData) {
      debouncedGeneratePreview()
    }

    // Cleanup function
    return () => {
      debouncedGeneratePreview.cancel()
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [memoizedData, debouncedGeneratePreview, previewUrl])

  return (
    <Card className={`${className} overflow-hidden`}>
      <div className="relative w-full h-[600px] bg-muted/10">
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {templateId ? 'Loading template preview...' : 'Generating preview...'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-destructive text-center">
              <p className="font-medium">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try again or check your input data
              </p>
            </div>
          </div>
        )}

        {previewUrl && !isGenerating && !error && (
          <embed
            src={previewUrl}
            type="application/pdf"
            className="w-full h-full"
          />
        )}

        {!previewUrl && !isGenerating && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Enter form data to see preview
            </p>
          </div>
        )}
      </div>
    </Card>
  )
} 