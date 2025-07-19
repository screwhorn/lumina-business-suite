import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Edit, Trash2, Search, Eye, Printer } from "lucide-react";
import { formatCurrency, formatDate, generateId, generateQuotationNumber, numberToWords } from "@/lib/utils";
import { Quotation, QuotationItem, getStorageData, addItem as addStorageItem, updateItem, deleteItem, STORAGE_KEYS } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>(getStorageData<Quotation>(STORAGE_KEYS.QUOTATIONS));
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState({
    quotationNo: generateQuotationNumber(),
    date: formatDate(new Date()),
    client: "",
    contact: "",
    project: "",
    location: "",
    trn: "",
    vatPercentage: "15"
  });
  const [items, setItems] = useState<QuotationItem[]>([
    { id: generateId(), description: "", qty: "", rate: "", amount: 0 }
  ]);
  const { toast } = useToast();

  const filteredQuotations = quotations.filter(quotation =>
    quotation.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const vatAmount = (subtotal * parseFloat(formData.vatPercentage)) / 100;
    const grandTotal = subtotal + vatAmount;
    return { subtotal, vatAmount, grandTotal };
  };

  const updateItemAmount = (index: number, qty: string, rate: string) => {
    const qtyNum = parseFloat(qty) || 0;
    const rateNum = parseFloat(rate) || 0;
    const amount = qtyNum * rateNum;
    
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], qty, rate, amount };
    setItems(updatedItems);
  };

  const addItem = () => {
    setItems([...items, { id: generateId(), description: "", qty: "", rate: "", amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { subtotal, vatAmount, grandTotal } = calculateTotals();
    
    const quotationData: Quotation = {
      id: editingQuotation?.id || generateId(),
      quotationNo: formData.quotationNo,
      date: formData.date,
      client: formData.client,
      contact: formData.contact,
      project: formData.project,
      location: formData.location,
      trn: formData.trn,
      items: items.filter(item => item.description.trim() !== ""),
      subtotal,
      vatPercentage: parseFloat(formData.vatPercentage),
      vatAmount,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
      createdAt: editingQuotation?.createdAt || new Date().toISOString()
    };

    if (editingQuotation) {
      updateItem<Quotation>(STORAGE_KEYS.QUOTATIONS, editingQuotation.id, quotationData);
      toast({
        title: "Quotation Updated",
        description: `Quotation ${quotationData.quotationNo} has been updated successfully.`,
      });
    } else {
      addStorageItem(STORAGE_KEYS.QUOTATIONS, quotationData);
      toast({
        title: "Quotation Created",
        description: `Quotation ${quotationData.quotationNo} has been created successfully.`,
      });
    }

    setQuotations(getStorageData<Quotation>(STORAGE_KEYS.QUOTATIONS));
    resetForm();
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormData({
      quotationNo: quotation.quotationNo,
      date: quotation.date,
      client: quotation.client,
      contact: quotation.contact,
      project: quotation.project,
      location: quotation.location,
      trn: quotation.trn,
      vatPercentage: quotation.vatPercentage.toString()
    });
    setItems(quotation.items.length > 0 ? quotation.items : [
      { id: generateId(), description: "", qty: "", rate: "", amount: 0 }
    ]);
    setIsDialogOpen(true);
  };

  const handleView = (quotation: Quotation) => {
    setViewingQuotation(quotation);
    setIsViewOpen(true);
  };

  const handlePrint = (quotation: Quotation) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation ${quotation.quotationNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-section { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f9fa; }
            .totals { margin-top: 20px; text-align: right; }
            .amount-words { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QUOTATION</h1>
            <h2>Lumina Business Suite</h2>
          </div>
          
          <div class="info-section">
            <p><strong>Quotation No:</strong> ${quotation.quotationNo}</p>
            <p><strong>Date:</strong> ${quotation.date}</p>
            <p><strong>Client:</strong> ${quotation.client}</p>
            <p><strong>Contact:</strong> ${quotation.contact}</p>
            <p><strong>Project:</strong> ${quotation.project}</p>
            <p><strong>Location:</strong> ${quotation.location}</p>
            <p><strong>TRN:</strong> ${quotation.trn}</p>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.qty}</td>
                  <td>${item.rate}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <p><strong>Subtotal: ${formatCurrency(quotation.subtotal)}</strong></p>
            <p><strong>VAT (${quotation.vatPercentage}%): ${formatCurrency(quotation.vatAmount)}</strong></p>
            <p style="font-size: 1.2em;"><strong>Grand Total: ${formatCurrency(quotation.grandTotal)}</strong></p>
          </div>
          
          <div class="amount-words">
            <p>Amount in Words: ${quotation.amountInWords}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = (quotation: Quotation) => {
    if (window.confirm(`Are you sure you want to delete quotation ${quotation.quotationNo}?`)) {
      deleteItem<Quotation>(STORAGE_KEYS.QUOTATIONS, quotation.id);
      setQuotations(getStorageData<Quotation>(STORAGE_KEYS.QUOTATIONS));
      toast({
        title: "Quotation Deleted",
        description: `Quotation ${quotation.quotationNo} has been deleted successfully.`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      quotationNo: generateQuotationNumber(),
      date: formatDate(new Date()),
      client: "",
      contact: "",
      project: "",
      location: "",
      trn: "",
      vatPercentage: "15"
    });
    setItems([{ id: generateId(), description: "", qty: "", rate: "", amount: 0 }]);
    setEditingQuotation(null);
    setIsDialogOpen(false);
  };

  const { subtotal, vatAmount, grandTotal } = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Quotation Management</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => resetForm()}>
              <Plus className="w-4 h-4" />
              New Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuotation ? "Edit Quotation" : "Create New Quotation"}
              </DialogTitle>
              <DialogDescription>
                Fill in the quotation details and items below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotationNo">Quotation No.</Label>
                    <Input
                      id="quotationNo"
                      value={formData.quotationNo}
                      onChange={(e) => setFormData({ ...formData, quotationNo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date.split('-').reverse().join('-')}
                      onChange={(e) => setFormData({ ...formData, date: formatDate(new Date(e.target.value)) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Input
                      id="project"
                      value={formData.project}
                      onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trn">TRN</Label>
                    <Input
                      id="trn"
                      value={formData.trn}
                      onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatPercentage">VAT %</Label>
                    <Input
                      id="vatPercentage"
                      type="number"
                      step="0.01"
                      value={formData.vatPercentage}
                      onChange={(e) => setFormData({ ...formData, vatPercentage: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border rounded-lg">
                        <div className="md:col-span-2">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => {
                              const updatedItems = [...items];
                              updatedItems[index] = { ...updatedItems[index], description: e.target.value };
                              setItems(updatedItems);
                            }}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Qty"
                            value={item.qty}
                            onChange={(e) => updateItemAmount(index, e.target.value, item.rate)}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => updateItemAmount(index, item.qty, e.target.value)}
                          />
                        </div>
                        <div>
                          <Input
                            placeholder="Amount"
                            value={formatCurrency(item.amount)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-right">
                  <p><strong>Subtotal: {formatCurrency(subtotal)}</strong></p>
                  <p><strong>VAT ({formData.vatPercentage}%): {formatCurrency(vatAmount)}</strong></p>
                  <p className="text-lg"><strong>Grand Total: {formatCurrency(grandTotal)}</strong></p>
                  <p className="text-sm text-muted-foreground">
                    Amount in Words: {numberToWords(grandTotal)}
                  </p>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingQuotation ? "Update Quotation" : "Create Quotation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Summary</CardTitle>
          <CardDescription>Overview of all quotations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{quotations.length}</div>
              <div className="text-sm text-muted-foreground">Total Quotations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {formatCurrency(quotations.reduce((sum, q) => sum + q.grandTotal, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {formatCurrency(quotations.reduce((sum, q) => sum + q.grandTotal, 0) / Math.max(quotations.length, 1))}
              </div>
              <div className="text-sm text-muted-foreground">Average Value</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Quotations</CardTitle>
              <CardDescription>Manage your quotations</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No quotations match your search." : "No quotations created yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((quotation) => (
                    <TableRow key={quotation.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{quotation.quotationNo}</TableCell>
                      <TableCell>{quotation.date}</TableCell>
                      <TableCell>{quotation.client}</TableCell>
                      <TableCell>{quotation.project}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(quotation.grandTotal)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(quotation)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(quotation)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(quotation)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(quotation)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Details</DialogTitle>
            <DialogDescription>
              {viewingQuotation && `Quotation ${viewingQuotation.quotationNo} - ${viewingQuotation.client}`}
            </DialogDescription>
          </DialogHeader>
          {viewingQuotation && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Quotation No:</strong> {viewingQuotation.quotationNo}</div>
                <div><strong>Date:</strong> {viewingQuotation.date}</div>
                <div><strong>Client:</strong> {viewingQuotation.client}</div>
                <div><strong>Contact:</strong> {viewingQuotation.contact}</div>
                <div><strong>Project:</strong> {viewingQuotation.project}</div>
                <div><strong>Location:</strong> {viewingQuotation.location}</div>
                <div><strong>TRN:</strong> {viewingQuotation.trn}</div>
                <div><strong>VAT:</strong> {viewingQuotation.vatPercentage}%</div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingQuotation.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>{item.rate}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="text-right space-y-2">
                <p><strong>Subtotal: {formatCurrency(viewingQuotation.subtotal)}</strong></p>
                <p><strong>VAT ({viewingQuotation.vatPercentage}%): {formatCurrency(viewingQuotation.vatAmount)}</strong></p>
                <p className="text-lg"><strong>Grand Total: {formatCurrency(viewingQuotation.grandTotal)}</strong></p>
                <p className="text-sm text-muted-foreground">
                  <strong>Amount in Words:</strong> {viewingQuotation.amountInWords}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            {viewingQuotation && (
              <Button onClick={() => handlePrint(viewingQuotation)} className="gap-2">
                <Printer className="w-4 h-4" />
                Print Quotation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}