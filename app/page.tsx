"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, FileText, Plus, Download, Eye, Settings, Search, Upload, Trash2, FileUp, X, Edit, Send } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DocumentForm } from '@/components/DocumentForm'
import { UserAvatar } from "@/components/UserAvatar"
import { TemplateUpload } from '@/components/TemplateUpload'
import { api } from '@/lib/api'
import { toast } from "@/components/ui/toast-context"
import { TextFormatter } from '@/components/TextFormatter'
import { cn } from "@/lib/utils"
import { Notifications } from "@/components/Notifications"
import { NotificationService } from "@/lib/notification-service"

export default function PDFGenerator() {
  const [templates, setTemplates] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'documents' | 'templates'>('documents')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<any>(null)
  const [vinSearchInput, setVinSearchInput] = useState('');
  const [vinSearchResult, setVinSearchResult] = useState(null);
  const [vinSearchLoading, setVinSearchLoading] = useState(false);
  const [vinSearchError, setVinSearchError] = useState(null);
  const [pendingTelegramData, setPendingTelegramData] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        await api.checkConnection()

        const [templatesData, documentsData] = await Promise.all([
          api.getTemplates(),
          api.getDocuments()
        ])
        setTemplates(templatesData)
        setDocuments(documentsData)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
        console.error('Failed to fetch data:', err)
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const checkForNewFormData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const chatId = urlParams.get('chat_id')
        
        if (chatId) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'
          const response = await fetch(`${apiBase}/telegram/form-data?chat_id=${chatId}`)
          if (response.ok) {
            const data = await response.json()
            setPendingTelegramData(data.formData ?? data)
            setIsCreateDialogOpen(true)
          } else {
            toast({
              title: 'Error',
              description: 'Failed to load document data',
              variant: 'destructive'
            })
          }
        }
      } catch (error) {
        console.error('Error checking for form data:', error)
        toast({
          title: 'Error',
          description: 'Failed to connect to server',
          variant: 'destructive'
        })
      }
    }

    checkForNewFormData()
  }, [])

  const handleTemplateUpload = async () => {
    try {
      const templatesData = await api.getTemplates()
      setTemplates(templatesData)
    } catch (error) {
      console.error('Failed to refresh templates:', error)
    }
  }

  const handleDocumentDelete = async (id: number) => {
    try {
      await api.deleteDocument(id)
      setDocuments(prev => prev.filter(doc => doc.id !== id))
      NotificationService.logDocumentActivity('Deleted document', `Document #${id}`)
    } catch (error) {
      NotificationService.logError('Failed to delete document')
    }
  }

  const handleDocumentDownload = async (id: number) => {
    try {
      const blob = await api.downloadDocument(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `document-${id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      NotificationService.logDocumentActivity('Downloaded document', `Document #${id}`)
    } catch (error) {
      NotificationService.logError('Failed to download document')
    }
  }

  const handleDocumentPreview = async (id: number) => {
    try {
      const blob = await api.previewDocument(id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 100)
      NotificationService.logDocumentActivity('Previewed document', `Document #${id}`)
    } catch (error) {
      NotificationService.logError('Failed to preview document')
    }
  }

  const handleTemplateDelete = async (id: number) => {
    try {
      await api.deleteTemplate(id)
      setTemplates(prev => prev.filter(template => template.id !== id))
      NotificationService.logTemplateActivity('Deleted template', `Template #${id}`)
    } catch (error) {
      NotificationService.logError('Failed to delete template')
    }
  }

  const handleDocumentEdit = (doc: any) => {
    setEditingDocument(doc)
    setIsCreateDialogOpen(true)
    NotificationService.logDocumentActivity('Started editing', doc.name)
  }

  const handleSectionChange = (section: 'documents' | 'templates') => {
    setActiveSection(section)
    NotificationService.logUserActivity(`Switched to ${section} section`)
  }

  const handleShareToTelegram = async (doc: any) => {
    try {
      // Get the document as a blob
      const blob = await api.previewDocument(doc.id)
      
      // Create form data with the PDF
      const formData = new FormData()
      formData.append('document', new File([blob], `${doc.name}.pdf`, { type: 'application/pdf' }))
      
      // Get chat ID from user input
      const chatId = prompt('Please enter your Telegram Chat ID:')
      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      formData.append('chat_id', chatId)
      
      // Share to Telegram using their Bot API
      const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.description || 'Failed to share to Telegram')
      }

      NotificationService.logDocumentActivity('Shared to Telegram', doc.name)
      toast({
        title: 'Success',
        description: 'Document shared to Telegram successfully'
      })
    } catch (error) {
      NotificationService.logError('Failed to share document')
      toast({
        title: 'Error',
        description: error.message || 'Failed to share document to Telegram',
        variant: 'destructive'
      })
    }
  }

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.template?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    new Date(doc.created_at).toLocaleDateString().includes(searchQuery)
  )

  const handleVinSearch = async (e) => {
    e.preventDefault();
    if (vinSearchInput.length !== 17) {
      setVinSearchError('VIN must be 17 characters long');
      return;
    }

    setVinSearchLoading(true);
    setVinSearchError(null);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_NHTSA_API_URL}/decodevin/${vinSearchInput}?format=json`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.Results || data.Results.length === 0) {
        throw new Error('No vehicle data found for this VIN');
      }
      
      // Get raw vehicle info
      const decodedVehicleData = {
        year: data.Results.find(item => item.Variable === "Model Year")?.Value || 'N/A',
        make: data.Results.find(item => item.Variable === "Make")?.Value || 'N/A',
        model: data.Results.find(item => item.Variable === "Model")?.Value || 'N/A',
        bodyClass: data.Results.find(item => item.Variable === "Body Class")?.Value || 'N/A',
      };

      // Properly capitalize make (e.g., HONDA -> Honda)
      const capitalizedMake = decodedVehicleData.make.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Check if we got any meaningful data
      if (Object.values(decodedVehicleData).every(value => value === 'N/A')) {
        throw new Error('Could not decode vehicle information from this VIN');
      }

      setVinSearchResult({
        ...decodedVehicleData,
        make: capitalizedMake // Use capitalized make for display
      });

      // Store data for PDF form
      const formData = {
        year: decodedVehicleData.year,
        make1: capitalizedMake, // Use capitalized make
        make2: capitalizedMake, // Use capitalized make
        model1: decodedVehicleData.model,
        model2: decodedVehicleData.model,
        vin1: vinSearchInput.toUpperCase(),
        vin2: vinSearchInput.toUpperCase(),
        vin3: vinSearchInput.toUpperCase(),
      };

      // Store in localStorage
      localStorage.setItem('pdfFormData', JSON.stringify(formData));

      // Show success message
      toast({
        title: 'Success',
        description: 'Vehicle information has been added to the PDF form',
      });

      NotificationService.logUserActivity(`VIN search successful for: ${vinSearchInput}`);
    } catch (err) {
      console.error('VIN search error:', err);
      setVinSearchError(err.message || 'Error fetching vehicle data. Please try again.');
      NotificationService.logError(`VIN search failed: ${err.message}`);
    } finally {
      setVinSearchLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>
          Retry Connection
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
        <Link className="flex items-center gap-2 font-semibold" href="#">
          <FileText className="h-6 w-6" />
          <span>PDFMaker</span>
        </Link>
        <nav className="flex-1">
          <ul className="flex items-center gap-4">
            <li>
              <button
                onClick={() => handleSectionChange('templates')}
                className={cn(
                  "text-sm font-medium hover:text-primary transition-colors",
                  activeSection === 'templates' ? "text-primary" : "text-muted-foreground"
                )}
              >
                Templates
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSectionChange('documents')}
                className={cn(
                  "text-sm font-medium hover:text-primary transition-colors",
                  activeSection === 'documents' ? "text-primary" : "text-muted-foreground"
                )}
              >
                Documents
              </button>
            </li>
          </ul>
        </nav>
        <div className="flex items-center gap-4">
          <Notifications />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-full" size="icon" variant="ghost">
                <UserAvatar className="h-8 w-8" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 p-6 bg-muted/40">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">
              {activeSection === 'templates' ? 'Templates' : 'Documents'}
            </h1>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {activeSection === 'templates' ? 'Upload Template' : 'New Document'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl">
                {activeSection === 'templates' ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Upload Template</DialogTitle>
                      <DialogDescription>
                        Upload a PDF template to use for document generation.
                      </DialogDescription>
                    </DialogHeader>
                    <TemplateUpload onUploadSuccess={handleTemplateUpload} />
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>
                        {editingDocument ? 'Edit Document' : 'Create Vehicle Transfer Document'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingDocument 
                          ? 'Edit the vehicle and owner information.'
                          : 'Fill in the vehicle and owner information to generate the transfer document.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <DocumentForm 
                      initialData={pendingTelegramData || editingDocument}
                      onClose={() => {
                        setIsCreateDialogOpen(false)
                        setEditingDocument(null)
                        setPendingTelegramData(null)
                      }}
                    />
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
          {activeSection === 'templates' ? (
            <Card>
              <CardHeader>
                <CardTitle>Available Templates</CardTitle>
                <CardDescription>Manage your PDF templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.description}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleTemplateDelete(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                  {templates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No templates available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Documents</CardTitle>
                    <CardDescription>View and manage your generated PDFs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Search documents..." 
                          className="flex-1"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => setSearchQuery('')}
                          disabled={!searchQuery}
                        >
                          {searchQuery ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                          >
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {doc.template} • {new Date(doc.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={doc.status === 'completed' ? 'success' : 'outline'}
                              >
                                {doc.status === 'draft' ? 'Draft' : 'Completed'}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => handleDocumentPreview(doc.id)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDocumentEdit(doc)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDocumentDownload(doc.id)}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleShareToTelegram(doc)}
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Share to Telegram
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDocumentDelete(doc.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                        
                        {filteredDocuments.length === 0 && !isLoading && (
                          <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? 'No documents found matching your search' : 'No documents found'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <div className="mt-6">
            <TextFormatter />
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick VIN Search</h2>
            <form onSubmit={handleVinSearch} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={vinSearchInput}
                  onChange={(e) => setVinSearchInput(e.target.value.toUpperCase())}
                  placeholder="Enter 17-digit VIN"
                  maxLength={17}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={vinSearchLoading}
                >
                  {vinSearchLoading ? (
                    <span className="animate-spin">↻</span>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {vinSearchError && (
                <p className="text-red-500 text-sm">{vinSearchError}</p>
              )}

              {vinSearchResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Year:</div>
                    <div>{vinSearchResult.year}</div>
                    <div className="font-medium">Make:</div>
                    <div>{vinSearchResult.make}</div>
                    <div className="font-medium">Model:</div>
                    <div>{vinSearchResult.model}</div>
                    <div className="font-medium">Body Type:</div>
                    <div>{vinSearchResult.bodyClass}</div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={() => {
                        // Store the form data
                        const formData = {
                          year: vinSearchResult.year,
                          make1: vinSearchResult.make,
                          make2: vinSearchResult.make,
                          model1: vinSearchResult.model,
                          model2: vinSearchResult.model,
                          vin1: vinSearchInput,
                          vin2: vinSearchInput,
                          vin3: vinSearchInput,
                        };
                        
                        // Store in localStorage
                        localStorage.setItem('pdfFormData', JSON.stringify(formData));
                        
                        // Open the form dialog
                        setIsCreateDialogOpen(true);
                        
                        // Log the activity
                        NotificationService.logUserActivity('Opened PDF form with VIN data');
                        
                        // Show success toast
                        toast({
                          title: 'Success',
                          description: 'Vehicle information loaded into form',
                        });
                      }}
                    >
                      Open in PDF Form
                    </Button>
                    <a 
                      href={`https://www.autocheck.com/vehiclehistory/?vin=${vinSearchInput}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                    >
                      Check Vehicle History
                    </a>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
} 