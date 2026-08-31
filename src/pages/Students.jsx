import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import StudentForm from "../components/students/StudentForm";
import StudentCard from "../components/students/StudentCard";
import StudentMonthlyFeesView from "../components/students/StudentMonthlyFeesView";
import ReceiptPreview from "../components/receipts/ReceiptPreview";

export default function Students() {
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudentForFees, setSelectedStudentForFees] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list('-created_date'),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const settings = appSettings[0] || {};

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      setShowForm(false);
      setEditingStudent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      setShowForm(false);
      setEditingStudent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
    },
  });

  const handleSubmit = (data) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      deleteMutation.mutate(id);
    }
  };

  const createReceiptForStudent = async (student, monthNumber, paymentDate = new Date().toISOString().split('T')[0], paymentMethod = 'pix') => {
    const amount = Number(student.monthly_payment || 0);
    const monthLabel = new Date(new Date().getFullYear(), monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const receiptPayload = {
      receipt_number: `REC-${Date.now()}`,
      student_id: student.id,
      student_name: student.full_name,
      amount,
      description: `Mensalidade ${monthLabel}`,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      status: 'paid',
    };

    const createdReceipt = await base44.entities.Receipt.create(receiptPayload);

    if (createdReceipt) {
      await base44.entities.Transaction.create({
        type: 'income',
        category: 'monthly_payment',
        amount,
        description: receiptPayload.description,
        date: paymentDate,
        payment_method: receiptPayload.payment_method,
        student_name: student.full_name,
      });
    }

    return createdReceipt;
  };

  const handleRegisterPayment = async (student, monthNumber = new Date().getMonth() + 1, paymentInfo = {}) => {
    const today = new Date().toISOString().split('T')[0];
    const paymentEntry = {
      month: String(monthNumber),
      year: String(new Date().getFullYear()),
      status: 'paid',
      paid_at: today,
      amount: Number(student.monthly_payment || 0),
      payment_method: paymentInfo.paymentMethod || 'pix',
    };

    const paymentHistory = Array.isArray(student.payment_history) ? [...student.payment_history] : [];
    const existingIndex = paymentHistory.findIndex((entry) => Number(entry.month) === monthNumber && Number(entry.year) === new Date().getFullYear());

    if (existingIndex >= 0) {
      paymentHistory[existingIndex] = paymentEntry;
    } else {
      paymentHistory.push(paymentEntry);
    }

    const updatedStudent = {
      ...student,
      payment_status: 'paid',
      last_payment_date: today,
      next_payment_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
      payment_history: paymentHistory,
    };

    await base44.entities.Student.update(student.id, updatedStudent);
    queryClient.invalidateQueries(['students']);
    return updatedStudent;
  };

  const handlePayMonth = async (student, monthNumber, paymentInfo = {}) => {
    const { generateReceipt = false, paymentMethod = 'pix' } = paymentInfo;
    const updatedStudent = await handleRegisterPayment(student, monthNumber, { paymentMethod });
    setSelectedStudentForFees(updatedStudent);

    if (generateReceipt) {
      const receipt = await createReceiptForStudent(student, monthNumber, new Date().toISOString().split('T')[0], paymentMethod);
      queryClient.invalidateQueries(['receipts']);
      setPreviewReceipt(receipt);
    }
  };

  const handleGenerateReceipt = async (student, monthNumber, paymentMethod = 'pix') => {
    const receipt = await createReceiptForStudent(student, monthNumber, new Date().toISOString().split('T')[0], paymentMethod);
    queryClient.invalidateQueries(['receipts']);
    setPreviewReceipt(receipt);
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.instrument?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedStudentForFees) {
    return (
      <div className="relative">
        <StudentMonthlyFeesView
          student={selectedStudentForFees}
          onBack={() => {
            setSelectedStudentForFees(null);
            setPreviewReceipt(null);
          }}
          onPay={(monthNumber, paymentInfo) => handlePayMonth(selectedStudentForFees, monthNumber, paymentInfo)}
          onGenerateReceipt={(monthNumber) => handleGenerateReceipt(selectedStudentForFees, monthNumber)}
        />

        {previewReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900">
              <ReceiptPreview
                receipt={previewReceipt}
                companySettings={settings}
                onClose={() => {
                  setPreviewReceipt(null);
                  queryClient.invalidateQueries(['students']);
                  setSelectedStudentForFees((currentStudent) => currentStudent ? { ...currentStudent } : currentStudent);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (previewReceipt) {
    return (
      <ReceiptPreview
        receipt={previewReceipt}
        companySettings={settings}
        onClose={() => {
          setPreviewReceipt(null);
          queryClient.invalidateQueries(['students']);
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            Alunos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie seus alunos de música
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingStudent(null);
            setShowForm(!showForm);
          }}
          className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 shadow-xl bg-white dark:bg-slate-800">
          <StudentForm
            student={editingStudent}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingStudent(null);
            }}
          />
        </Card>
      )}

      <Card className="p-4 shadow-lg bg-white dark:bg-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar por nome ou instrumento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6 animate-pulse bg-white dark:bg-slate-800">
              <div className="h-32 rounded bg-slate-200 dark:bg-slate-700" />
            </Card>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-12 shadow-xl bg-white dark:bg-slate-800">
          <p className="text-center text-slate-500 dark:text-slate-400">
            Nenhum aluno encontrado
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={() => handleEdit(student)}
              onDelete={() => handleDelete(student.id)}
              onRegisterPayment={() => handleRegisterPayment(student)}
              onOpenMonthlyFees={() => setSelectedStudentForFees(student)}
            />
          ))}
        </div>
      )}
    </div>
  );
}