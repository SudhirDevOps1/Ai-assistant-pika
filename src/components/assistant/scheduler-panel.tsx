'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePcBridge } from '@/hooks/use-pc-bridge'
import { toast } from 'sonner'
import { Calendar, Plus, Clock, Terminal, Trash2 } from 'lucide-react'

export function SchedulerPanel() {
  const { sendCommand } = usePcBridge()
  const [tasks, setTasks] = useState<any[]>([])
  
  // Form fields
  const [taskName, setTaskName] = useState('')
  const [taskCron, setTaskCron] = useState('')
  const [taskCategory, setTaskCategory] = useState('system')
  const [taskAction, setTaskAction] = useState('sleep')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const res: any = await sendCommand('scheduler', 'list', {})
      if (res.success && res.data?.tasks) {
        setTasks(res.data.tasks)
      }
    } catch {}
  }

  const handleScheduleTask = async () => {
    if (!taskName.trim() || !taskCron.trim()) {
      toast.error('Task Name and Time are required')
      return
    }

    try {
      const command = { category: taskCategory, action: taskAction, params: {} }
      const res: any = await sendCommand('scheduler', 'add', {
        name: taskName,
        cron: taskCron,
        command: command
      })

      if (res.success) {
        toast.success(res.message)
        setTaskName('')
        setTaskCron('')
        loadTasks()
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Task Scheduler</h2>
          <p className="text-xs text-muted-foreground">Automate commands to run on schedule.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Scheduler Form */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            Schedule New Task
          </h3>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Task Name:</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="E.g. Sleep Timer"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Schedule Time / Interval:</label>
              <input
                type="text"
                value={taskCron}
                onChange={(e) => setTaskCron(e.target.value)}
                placeholder="E.g. every 30 minutes, or at 22:30"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Category:</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="w-full bg-[#0f0f20] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="system">System</option>
                  <option value="volume">Volume</option>
                  <option value="media">Media</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Action:</label>
                <select
                  value={taskAction}
                  onChange={(e) => setTaskAction(e.target.value)}
                  className="w-full bg-[#0f0f20] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  {taskCategory === 'system' && (
                    <>
                      <option value="sleep">Sleep</option>
                      <option value="lock">Lock</option>
                      <option value="shutdown">Shutdown</option>
                    </>
                  )}
                  {taskCategory === 'volume' && (
                    <>
                      <option value="mute">Mute</option>
                      <option value="unmute">Unmute</option>
                    </>
                  )}
                  {taskCategory === 'media' && (
                    <>
                      <option value="pause">Pause</option>
                      <option value="play_pause">Toggle Play</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <button
              onClick={handleScheduleTask}
              className="w-full mt-2 py-2 text-xs font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-all shadow-lg shadow-cyan-500/20"
            >
              Add Scheduled Task
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Active Tasks</h3>
          
          <div className="divide-y divide-white/5">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No active scheduled tasks found.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{task.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-purple-400" />
                        <span>{task.command?.category}/{task.command?.action}</span>
                        <span>•</span>
                        <span>{task.cron}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
