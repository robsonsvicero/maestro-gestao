import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Pencil, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  scheduled: { label: "Agendada", class: "bg-blue-100 text-blue-800" },
  completed: { label: "Concluída", class: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", class: "bg-red-100 text-red-800" },
  rescheduled: { label: "Remarcada", class: "bg-yellow-100 text-yellow-800" }
};

const paymentStatusConfig = {
  pending: { label: "Pendente", class: "bg-orange-100 text-orange-800" },
  paid: { label: "Pago", class: "bg-green-100 text-green-800" }
};

export default function LessonCard({ lesson, onEdit, onDelete, onStatusChange, theme, showDate = false }) {
  return (
    <Card className={`backdrop-blur-xl shadow-lg hover:shadow-xl transition-all ${
      theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`font-bold text-lg ${
                  theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {lesson.student_name}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lesson.instrument}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={statusConfig[lesson.status]?.class}>
                  {statusConfig[lesson.status]?.label}
                </Badge>
                {lesson.payment_status && (
                  <Badge className={paymentStatusConfig[lesson.payment_status]?.class}>
                    {paymentStatusConfig[lesson.payment_status]?.label}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {showDate && (
                <div className={`flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <Clock className="w-4 h-4" />
                  {format(new Date(lesson.date), "dd/MM/yyyy")}
                </div>
              )}
              <div className={`flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                <Clock className="w-4 h-4" />
                {lesson.start_time} - {lesson.end_time} ({lesson.duration}min)
              </div>
              {lesson.location && (
                <div className={`flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <MapPin className="w-4 h-4" />
                  {lesson.location}
                </div>
              )}
            </div>

            {lesson.notes && (
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {lesson.notes}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onStatusChange(lesson, 'scheduled')}>
                  Agendada
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(lesson, 'completed')}>
                  Concluída
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(lesson, 'cancelled')}>
                  Cancelada
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(lesson, 'rescheduled')}>
                  Remarcada
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              variant="outline"
              onClick={onEdit}
              className="text-[#094C7E] hover:bg-blue-50"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}