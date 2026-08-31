const fs = require('fs');

let panel = fs.readFileSync('components/task/TaskManagementPanel.tsx', 'utf8');

// 1. imports
panel = panel.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useEffect } from 'react';"
);

// 2. add fetchTasks and redoTask to destructuring
panel = panel.replace(
  "    loadTasks,\n  } = useTaskStore();",
  "    loadTasks,\n    fetchTasks,\n    redoTask,\n  } = useTaskStore();\n\n  useEffect(() => {\n    fetchTasks();\n  }, [fetchTasks]);\n\n  const handleRedo = async (taskId: string) => {\n    const res = await redoTask(taskId);\n    if (res && res.success) {\n      setFeedbackMsg({ type: 'success', text: `Task re-queued successfully as ${res.newTaskId}.` });\n    } else {\n      setFeedbackMsg({ type: 'error', text: `Failed to redo task.` });\n    }\n    setTimeout(() => setFeedbackMsg(null), 3000);\n  };\n"
);

// 3. update status rendering
const oldStatusCell = `<td className="p-3 border-r border-border">{renderStatusBadge(t.status)}</td>`;
const newStatusCell = `<td className="p-3 border-r border-border">\n                      <div className="flex items-center gap-2">\n                        {renderStatusBadge(t.status)}\n                        {(t.status === 'COMPLETED' || t.status === 'FAILED') && (\n                          <button \n                            onClick={() => handleRedo(t.task_id)} \n                            className="p-1 hover:bg-workspace border border-transparent hover:border-border rounded text-muted hover:text-text transition-colors" \n                            title="Redo Task"\n                          >\n                            <RotateCcw size={12} />\n                          </button>\n                        )}\n                      </div>\n                    </td>`;

panel = panel.replace(oldStatusCell, newStatusCell);

fs.writeFileSync('components/task/TaskManagementPanel.tsx', panel, 'utf8');
