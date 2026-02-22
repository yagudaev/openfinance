'use client'

import { useState, useEffect } from 'react'
import Uppy from '@uppy/core'
import Dashboard from '@uppy/react/dashboard'
import XHRUpload from '@uppy/xhr-upload'

import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'

interface UppyUploaderProps {
  endpoint: string
  fieldName?: string
  allowedFileTypes?: string[]
  maxFileSize?: number
  maxNumberOfFiles?: number
  note?: string
  /** Called after each individual file upload succeeds */
  onUploadSuccess?: (file: { name: string }, response: { body: Record<string, unknown> }) => void
  /** Called after all files in the batch have been uploaded */
  onUploadComplete?: (result: { successful: unknown[]; failed: unknown[] }) => void
  /** Extra form data fields to send with each upload */
  meta?: Record<string, string>
  /** Allowed meta fields to send to the server (field names from `meta`) */
  allowedMetaFields?: string[]
  height?: number
}

const DEFAULT_ALLOWED_FILE_TYPES = [
  '.pdf', '.md', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.xlsx', '.xls',
]
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const DEFAULT_MAX_NUMBER_OF_FILES = 20

export function UppyUploader({
  endpoint,
  fieldName = 'file',
  allowedFileTypes = DEFAULT_ALLOWED_FILE_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxNumberOfFiles = DEFAULT_MAX_NUMBER_OF_FILES,
  note,
  onUploadSuccess,
  onUploadComplete,
  meta,
  allowedMetaFields,
  height = 350,
}: UppyUploaderProps) {
  const [uppy] = useState(() => {
    const instance = new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
        allowedFileTypes,
      },
      autoProceed: false,
    })

    instance.use(XHRUpload, {
      endpoint,
      fieldName,
      formData: true,
      allowedMetaFields: allowedMetaFields ?? false,
    })

    if (meta) {
      instance.setMeta(meta)
    }

    return instance
  })

  useEffect(() => {
    if (onUploadSuccess) {
      const handler = (file: unknown, response: unknown) => {
        const f = file as { name: string } | undefined
        const r = response as { body: Record<string, unknown> } | undefined
        if (f && r) {
          onUploadSuccess(f, r)
        }
      }
      uppy.on('upload-success', handler)
      return () => {
        uppy.off('upload-success', handler)
      }
    }
  }, [uppy, onUploadSuccess])

  useEffect(() => {
    if (onUploadComplete) {
      const handler = (result: unknown) => {
        onUploadComplete(result as { successful: unknown[]; failed: unknown[] })
      }
      uppy.on('complete', handler)
      return () => {
        uppy.off('complete', handler)
      }
    }
  }, [uppy, onUploadComplete])

  // Clean up Uppy instance on unmount
  useEffect(() => {
    return () => {
      uppy.destroy()
    }
  }, [uppy])

  return (
    <Dashboard
      uppy={uppy}
      height={height}
      theme="light"
      proudlyDisplayPoweredByUppy={false}
      hideProgressDetails={false}
      note={note ?? formatNote(allowedFileTypes, maxFileSize)}
      fileManagerSelectionType="both"
      showRemoveButtonAfterComplete
      doneButtonHandler={() => {
        uppy.clear()
      }}
    />
  )
}

function formatNote(allowedFileTypes: string[], maxFileSize: number): string {
  const types = allowedFileTypes
    .map(t => t.replace('.', '').toUpperCase())
    .join(', ')

  const sizeMB = Math.round(maxFileSize / (1024 * 1024))
  return `${types} files up to ${sizeMB} MB`
}
