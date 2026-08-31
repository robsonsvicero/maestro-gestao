import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon, iconColor, bgGradient, trend, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative ${
        theme === 'dark' 
          ? 'bg-slate-800/80' 
          : `bg-gradient-to-br ${bgGradient}`
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-10">
          <Icon className="w-full h-full" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <p className={`text-sm font-medium ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}>{title}</p>
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-white/50'
            } backdrop-blur-sm`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
          </div>
          <p className={`text-2xl md:text-3xl font-bold mb-1 ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {value}
          </p>
          {trend && (
            <p className={`text-xs ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>{trend}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}