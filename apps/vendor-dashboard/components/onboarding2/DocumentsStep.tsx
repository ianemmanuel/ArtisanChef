"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Loader2,
  Upload,
  FileText,
  Trash2,
  Calendar,
  Eye,
} from "lucide-react"
import { format } from "date-fns"
import {
  documentUploadSchema,
  DocumentUploadFormData,
} from "@/lib/validations/onboarding"
import {
  uploadDocument,
  deleteDocument,
  uploadFileToStorage,
  getDocumentTypes,
  previewDocument,
} from "@/lib/api/onboarding"
import { useOnboardingStore } from "@/lib/state/onboarding-store"
import { VendorDocument, DocumentStatus } from "@repo/types"
import { Button } from "@repo/ui/components/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import { Input } from "@repo/ui/components/input"
import { Calendar as CalendarComponent } from "@repo/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover"
import { toast } from "sonner"
import { cn } from "@repo/ui/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Badge } from "@repo/ui/components/badge"

interface DocumentsFormProps {
  onNext: () => void
  onBack: () => void
}

interface DocumentType {
  id: string
  name: string
  description?: string
  required: boolean
}

export default function DocumentsStep({
  onNext,
  onBack,
}: DocumentsFormProps) {
  const { application, updateApplicationDocuments } = useOnboardingStore()

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentTypeId: "",
      documentNumber: "",
      issueDate: undefined,
      expiryDate: undefined,
    },
  })

  //* =============LOAD DOCUMENT REQUIREMENTS============================
     
  useEffect(() => {
    async function loadRequirements() {
      if (!application?.id) return

      const { data, error } = await getDocumentTypes(application.id)

      if (error) {
        toast.error("Failed to load document requirements")
        return
      }

      setDocumentTypes(
        data.requirements.map((r: any) => ({
          id: r.documentTypeId,
          name: r.name,
          description: r.description,
          required: r.isRequired,
        }))
      )
    }

    loadRequirements()
  }, [application?.id])

  //* ================FILE HANDLING=====================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.warning("Please select a file smaller than 10MB")
      return
    }

    setSelectedFile(file)
  }

  //* ==============SUBMIT DOCUMENT====================

  const onSubmit = async (data: DocumentUploadFormData) => {
    if (!selectedFile || !application?.id) {
      toast.warning("Please select a file to upload")
      return
    }

    setIsUploading(true)

    //* 1️⃣ Presigned Upload
    const { storageKey, error: uploadError } =
      await uploadFileToStorage(
        selectedFile,
        application.id,
        data.documentTypeId
      )

    if (uploadError || !storageKey) {
      toast.error(uploadError || "Upload failed")
      setIsUploading(false)
      return
    }

    //? 2️⃣ Confirm with backend
    const { data: response, error } = await uploadDocument({
      applicationId: application.id,
      documentTypeId: data.documentTypeId,
      storageKey,
      documentName: selectedFile.name,
      fileSize: selectedFile.size,
      mimeType: selectedFile.type,
      documentNumber: data.documentNumber,
      issueDate: data.issueDate?.toISOString(),
      expiryDate: data.expiryDate?.toISOString(),
    })

    if (error || !response) {
      toast.error(error || "Failed to save document")
      setIsUploading(false)
      return
    }

    const newDoc = response.document

    const updatedDocs = application.documents.some(
      (d) => d.id === newDoc.id
    )
      ? application.documents.map((d) =>
          d.id === newDoc.id ? newDoc : d
        )
      : [...application.documents, newDoc]

    updateApplicationDocuments(updatedDocs)

    toast.success(response.message)
    form.reset()
    setSelectedFile(null)
    setIsUploading(false)
  }

  //* ================= DELETE DOCUMENT========================
    
  const handleDelete = async (docId: string) => {
    setDeletingDocId(docId)

    const { error } = await deleteDocument(docId)

    if (error) {
      toast.error(error)
      setDeletingDocId(null)
      return
    }

    updateApplicationDocuments(
      application!.documents.filter((d) => d.id !== docId)
    )

    toast.success("Document deleted successfully")
    setDeletingDocId(null)
  }

  //* =================PREVIEW DOCUMENT=================
     
  const handlePreview = async (docId: string) => {
    const { url, error } = await previewDocument(docId)

    if (error || !url) {
      toast.error(error || "Failed to preview document")
      return
    }

    window.open(url, "_blank", "noopener,noreferrer")
  }

  //* ==================DERIVED DATA==================

  const uploadedDocsByType = useMemo(() => {
    const map: Record<string, VendorDocument> = {}

    application?.documents.forEach((doc) => {
      if (
        doc.status !== DocumentStatus.WITHDRAWN &&
        !doc.supersededAt
      ) {
        map[doc.documentTypeId] = doc
      }
    })

    return map
  }, [application?.documents])

  const missingRequiredDocs = documentTypes.filter(
    (dt) => dt.required && !uploadedDocsByType[dt.id]
  )


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload required documents for your application
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* DOCUMENT TYPE */}
              <FormField
                control={form.control}
                name="documentTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem
                            key={type.id}
                            value={type.id}
                          >
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              {type.required && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  Required
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {documentTypes.find(
                      (t) => t.id === field.value
                    )?.description && (
                      <FormDescription>
                        {
                          documentTypes.find(
                            (t) => t.id === field.value
                          )?.description
                        }
                      </FormDescription>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>File *</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="truncate max-w-50">
                          {selectedFile.name}
                        </span>
                        <span>
                          ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                    )}
                  </div>
                </FormControl>

                <FormDescription>
                  Accepted formats: PDF, JPG, PNG. Max size:
                  10MB
                </FormDescription>
              </FormItem>

              {/* DATES + NUMBER */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DOC123456"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ISSUE DATE */}
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value &&
                                  "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>

                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                        >
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() ||
                              date <
                                new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* EXPIRY DATE */}
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value &&
                                  "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>

                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                        >
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ================= UPLOADED DOCS ================= */}
      {application && application.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              {missingRequiredDocs.length > 0 ? (
                <span className="text-destructive">
                  {missingRequiredDocs.length} required
                  document(s) missing
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">
                  All required documents uploaded
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {application.documents
                .filter(
                  (doc) =>
                    doc.status !==
                      DocumentStatus.WITHDRAWN &&
                    !doc.supersededAt
                )
                .map((doc) => {
                  const docType =
                    documentTypes.find(
                      (dt) =>
                        dt.id === doc.documentTypeId
                    )

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">
                              {docType?.name ||
                                "Unknown"}
                            </p>
                            <Badge
                              variant={
                                doc.status ===
                                DocumentStatus.APPROVED
                                  ? "default"
                                  : doc.status ===
                                    DocumentStatus.REJECTED
                                  ? "destructive"
                                  : doc.status ===
                                    DocumentStatus.WITHDRAWN
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {doc.documentName}
                          </p>

                          {doc.rejectionReason && (
                            <p className="text-sm text-destructive">
                              Rejection reason:{" "}
                              {doc.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handlePreview(doc.id)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(doc.id)
                          }
                          disabled={
                            deletingDocId === doc.id
                          }
                        >
                          {deletingDocId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= NAVIGATION ================= */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
        >
          Back
        </Button>

        <Button
          onClick={onNext}
          size="lg"
          disabled={missingRequiredDocs.length > 0}
          className="min-w-35"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  )
}
