const fs = require('fs');

// AddTaskModal.tsx
let addModal = fs.readFileSync('components/task/AddTaskModal.tsx', 'utf8');
addModal = addModal.replace(/const handleSubmit = \(e: React.FormEvent\) => \{/, 'const handleSubmit = async (e: React.FormEvent) => {');
addModal = addModal.replace(/const res = createTask\(\{/, 'const res = await createTask({');
fs.writeFileSync('components/task/AddTaskModal.tsx', addModal, 'utf8');

// UploadTaskListModal.tsx
let uploadModal = fs.readFileSync('components/task/UploadTaskListModal.tsx', 'utf8');
uploadModal = uploadModal.replace(/const handleConfirm = \(\) => \{/, 'const handleConfirm = async () => {');
uploadModal = uploadModal.replace(/const result = addMultipleTasks\(validRows\);/, 'const result = await addMultipleTasks(validRows);');
fs.writeFileSync('components/task/UploadTaskListModal.tsx', uploadModal, 'utf8');
