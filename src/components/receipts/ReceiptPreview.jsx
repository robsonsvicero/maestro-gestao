import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Printer, Share2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/utils/dateUtils";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const paymentMethodLabels = {
  cash: "Dinheiro",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  bank_transfer: "Transferência Bancária"
};

function numberToWords(num) {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (num === 0) return 'zero';
  if (num === 100) return 'cem';

  let words = '';

  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) words += ' e ';
  }

  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) words += ' e ';
  }

  if (num >= 10) {
    words += teens[num - 10];
    num = 0;
  }

  if (num > 0) {
    words += units[num];
  }

  return words;
}

function amountToWords(amount) {
  const [reais, centavos] = amount.toFixed(2).split('.').map(Number);

  let result = '';

  if (reais === 0) {
    result = 'zero reais';
  } else if (reais === 1) {
    result = 'um real';
  } else {
    result = numberToWords(reais) + ' reais';
  }

  if (centavos > 0) {
    result += ' e ' + numberToWords(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return result;
}

export default function ReceiptPreview({ receipt, companySettings, onClose, theme }) {
  const receiptRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const fileName = `recibo-${receipt.receipt_number || receipt.id || 'pagamento'}.pdf`;

  const createPdf = async () => {
    if (!receiptRef.current) throw new Error('Não foi possível localizar o recibo para gerar o PDF.');
    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const imageWidth = canvas.width * scale;
    const imageHeight = canvas.height * scale;
    const image = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(
      image,
      'JPEG',
      (pageWidth - imageWidth) / 2,
      (pageHeight - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
    return pdf;
  };

  const handlePdf = async () => {
    setIsExporting(true);
    try {
      const pdf = await createPdf();
      if (!isNative) {
        pdf.save(fileName);
        return;
      }

      const data = pdf.output('datauristring').split(',')[1];
      const saved = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Documents });
      await Share.share({
        title: 'Recibo em PDF',
        text: 'Recibo de pagamento',
        url: saved.uri,
        dialogTitle: 'Salvar, enviar ou imprimir recibo',
      });
    } catch (error) {
      console.error('Erro ao gerar recibo em PDF:', error);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => isNative ? handlePdf() : window.print();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Recibo
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Pré-visualização
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={isExporting}>
            <Printer className="w-4 h-4 mr-2" />
            {isNative ? 'Imprimir / Compartilhar' : 'Imprimir'}
          </Button>
          <Button onClick={handlePdf} disabled={isExporting} className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]">
            {isNative ? <Share2 className="w-4 h-4 mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
            {isExporting ? 'Gerando PDF...' : isNative ? 'Salvar / Compartilhar PDF' : 'Baixar PDF'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar preview do recibo"
            className="h-10 w-10 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card ref={receiptRef} className={`backdrop-blur-xl shadow-xl max-w-4xl mx-auto ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-12">
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {companySettings?.school_name || "Professor de Música"}
            </h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              RECIBO DE PAGAMENTO
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              Nº {receipt.receipt_number}
            </p>
          </div>

          <div className={`border-t border-b py-6 mb-6 ${
            theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
          }`}>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Valor:
                </p>
                <p className={`text-2xl font-bold text-[#094C7E]`}>
                  R$ {receipt.amount.toFixed(2)}
                </p>
                <p className={`text-sm italic mt-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  ({amountToWords(receipt.amount)})
                </p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Data do Pagamento:
                </p>
                <p className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>
                  {format(parseLocalDate(receipt.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Recebemos de:
                </p>
                <p className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>
                  {receipt.student_name}
                </p>
              </div>

              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Referente a:
                </p>
                <p className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>
                  {receipt.description}
                </p>
              </div>

              <div>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Forma de Pagamento:
                </p>
                <p className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>
                  {paymentMethodLabels[receipt.payment_method]}
                </p>
              </div>

              {receipt.notes && (
                <div>
                  <p className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Observações:
                  </p>
                  <p className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>
                    {receipt.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-12 pt-8">
            <div className={`border-t w-64 mx-auto mb-2 ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-400'
            }`}></div>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {companySettings?.school_name || "Assinatura"}
            </p>
          </div>

          <div className={`text-center text-xs mt-8 ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <p>Recibo emitido em {format(parseLocalDate(receipt.created_date || receipt.issue_date || receipt.payment_date), "dd/MM/yyyy")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
