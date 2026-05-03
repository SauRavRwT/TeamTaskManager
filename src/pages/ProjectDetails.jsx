import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';

export default function ProjectDetails() {
  const { id } = useParams();
  const { dbUser } = useAuth();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const fetchData = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const projectRes = await fetch(`/api/projects/${id}`, { headers });
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      if (dbUser.role === 'ADMIN') {
        const usersRes = await fetch('/api/auth/users', { headers });
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchData();
    }
  }, [id]);

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          projectId: id,
          assigneeId: assigneeId || null
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setAssigneeId('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (loading) return <div className="container mt-5">Loading...</div>;
  if (!project) return <div className="container mt-5">Project not found.</div>;

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">Team Task Manager</Link>
          <div className="d-flex align-items-center">
            <Link to="/" className="btn btn-outline-light btn-sm">Back to Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="row">
          <div className="col-12 mb-4">
            <h2>{project.name}</h2>
            <p className="text-muted">{project.description}</p>
            <p><strong>Manager:</strong> {project.manager.name} ({project.manager.email})</p>
          </div>

          {dbUser.role === 'ADMIN' && (
            <div className="col-md-4 mb-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Add New Task</h5>
                  <form onSubmit={createTask}>
                    <div className="mb-2">
                      <input type="text" className="form-control" placeholder="Task Title" required
                        value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <textarea className="form-control" placeholder="Description" rows="2"
                        value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}></textarea>
                    </div>
                    <div className="mb-3">
                      <select className="form-select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-primary btn-sm w-100" type="submit">Create Task</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className={`col-md-${dbUser.role === 'ADMIN' ? '8' : '12'}`}>
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h4 className="mb-0">Tasks</h4>
              </div>
              <ul className="list-group list-group-flush">
                {project.tasks.map(task => {
                  const canEditStatus = dbUser.role === 'ADMIN' || dbUser.id === task.assigneeId;
                  
                  return (
                    <li key={task.id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="mb-1">{task.title}</h5>
                          <p className="mb-1 text-muted">{task.description}</p>
                          <small>Assignee: <strong>{task.assignee ? task.assignee.name : 'Unassigned'}</strong></small>
                        </div>
                        <div>
                          {canEditStatus ? (
                            <select 
                              className={`form-select form-select-sm ${task.status === 'DONE' ? 'border-success' : task.status === 'IN_PROGRESS' ? 'border-warning' : 'border-secondary'}`}
                              value={task.status} 
                              onChange={(e) => updateStatus(task.id, e.target.value)}
                              style={{width: '130px'}}
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Done</option>
                            </select>
                          ) : (
                            <span className={`badge ${task.status === 'DONE' ? 'bg-success' : task.status === 'IN_PROGRESS' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {project.tasks.length === 0 && <li className="list-group-item text-center py-4 text-muted">No tasks created yet.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
