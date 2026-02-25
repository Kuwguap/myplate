"use client"

import * as React from "react"
import { ToastContainer } from "@/components/ui/toast-context"
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast-context'
import { NotificationService } from '@/lib/notification-service'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showAlert, setShowAlert] = React.useState(false)
  const [copiedText, setCopiedText] = React.useState('')

  const handleCopy = async (text: string, type: 'Group' | 'DM') => {
    try {
      await navigator.clipboard.writeText(text)
      
      // Set copied text and show alert
      setCopiedText(text)
      setShowAlert(true)

      // Show toast
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard',
      })

      // Add notification
      NotificationService.logUserActivity(`Copied ${type} ID: ${text}`)

      // Auto hide alert after 2 seconds
      setTimeout(() => {
        setShowAlert(false)
      }, 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy text',
        variant: 'destructive'
      })
      NotificationService.logError('Failed to copy to clipboard')
    }
  }

  return (
    <html lang="en">
      <body>
        <div className="sticky top-0 z-50 bg-background border-b px-4 py-2 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Group: -697929340</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => handleCopy('-697929340', 'Group')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">DM: 6197000205</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => handleCopy('6197000205', 'DM')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Ethernet: 5570644510</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => handleCopy('5570644510', 'Ethernet')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ToastContainer>
          {children}
        </ToastContainer>

        <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Copied to Clipboard</AlertDialogTitle>
              <AlertDialogDescription>
                The text <span className="font-medium">{copiedText}</span> has been copied to your clipboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      </body>
    </html>
  )
} 