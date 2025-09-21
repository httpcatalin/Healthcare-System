'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, UploadCloud, CheckCircle } from 'lucide-react'
import { getOrdersBootstrap, type Supplier } from '@/lib/purchase-orders'
import { useAuth } from '@/hooks/use-auth'

type ParsedItem = {
  itemId?: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  urgency: 'low' | 'medium' | 'high'
}

const API_BASE = 'http://localhost:8000/api'

export function InvoiceProcessor() {
  const { auth } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [items, setItems] = useState<ParsedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [committed, setCommitted] = useState<{
    updated: any[]
    purchaseOrderId?: string
  } | null>(null)

  useEffect(() => {
    let mounted = true
    getOrdersBootstrap().then((boot) => {
      if (!mounted) return
      setSuppliers(boot.suppliers)
      if (boot.suppliers.length > 0) setSupplierId(boot.suppliers[0].id)
    })
    return () => {
      mounted = false
    }
  }, [])

  const total = useMemo(
    () => items.reduce((s, it) => s + (it.totalPrice || it.quantity * it.unitPrice), 0),
    [items]
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setExtractedText('')
      setItems([])
      setCommitted(null)
    }
  }

  const extract = async () => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/invoice/extract`, {
        method: 'POST',
        body: form
      })
      if (!res.ok) throw new Error('Failed to extract')
      const data = await res.json()
      setExtractedText(data.text || '')
      setItems(
        (data.items || []).map((it: any) => ({
          itemId: it.itemId,
          itemName: it.itemName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          urgency: it.urgency || 'medium'
        }))
      )
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const commit = async () => {
    setLoading(true)
    try {
      const payload = {
        items,
        supplierId: supplierId || undefined,
        createdBy: auth.user?.name || 'system'
      }
      const res = await fetch(`${API_BASE}/invoice/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to commit')
      const data = await res.json()
      setCommitted(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              ...patch,
              totalPrice:
                (patch.unitPrice ?? it.unitPrice) * (patch.quantity ?? it.quantity)
            }
          : it
      )
    )
  }

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-xl">
            <FileText className="h-5 w-5" /> Invoice Processor
          </CardTitle>
          <CardDescription>
            Upload an invoice image/PDF, extract items, adjust if needed, select supplier,
            and save to DB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="mb-1">Invoice File</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={onFileChange}
                className="bg-white"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={extract} disabled={!file || loading} className="w-full">
                <UploadCloud className="h-4 w-4 mr-2" /> Extract Items
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2">Supplier</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold">${total.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={it.itemName}
                            onChange={(e) =>
                              updateItem(idx, { itemName: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(idx, { quantity: Number(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateItem(idx, { unitPrice: Number(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          ${(it.totalPrice || it.quantity * it.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(idx)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={commit} disabled={items.length === 0 || loading}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Save to Database
                </Button>
              </div>
            </div>
          )}

          {committed && (
            <Alert>
              <AlertDescription>
                Saved. {committed.updated.length} inventory items were updated or created.
                {committed.purchaseOrderId
                  ? ` Purchase Order: ${committed.purchaseOrderId}`
                  : ''}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
