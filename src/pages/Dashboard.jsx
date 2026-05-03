import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { dbUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const fetchDashboardData = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [projectsRes, tasksRes] = await Promise.all([
        fetch('/api/projects', { headers }),
        fetch('/api/tasks', { headers })
      ]);

      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchDashboardData();
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });
      if (res.ok) {
        setNewProjectName('');
        setNewProjectDesc('');
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  if (loading || !dbUser) return <div className="container mt-5">Loading...</div>;

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">Team Task Manager</Link>
          <div className="d-flex align-items-center">
            <span className="text-light me-3">Welcome, {dbUser.name} ({dbUser.role})</span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <div className="row">
          {/* Projects Column */}
          <div className="col-md-4">
            <h3>Projects</h3>
            {dbUser.role === 'ADMIN' && (
              <div className="card mb-4 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">New Project</h5>
                  <form onSubmit={createProject}>
                    <div className="mb-2">
                      <input type="text" className="form-control" placeholder="Project Name" required
                        value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <textarea className="form-control" placeholder="Description" rows="2"
                        value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}></textarea>
                    </div>
                    <button className="btn btn-primary btn-sm w-100" type="submit">Create</button>
                  </form>
                </div>
              </div>
            )}
            
            <ul className="list-group">
              {projects.map(project => (
                <Link to={`/project/${project.id}`} key={project.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0">{project.name}</h6>
                    <small className="text-muted">Manager: {project.manager.name}</small>
                  </div>
                  <span className="badge bg-primary rounded-pill">{project._count?.tasks || 0} tasks</span>
                </Link>
              ))}
              {projects.length === 0 && <li className="list-group-item">No projects found.</li>}
            </ul>
          </div>

          {/* Tasks Column */}
          <div className="col-md-8">
            <h3>{dbUser.role === 'ADMIN' ? 'All Tasks' : 'My Tasks'}</h3>
            <div className="card shadow-sm">
              <ul className="list-group list-group-flush">
                {tasks.map(task => (
                  <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{task.title}</h5>
                      <p className="mb-1 text-muted small">{task.description}</p>
                      <small>
                        Project: <strong>{task.project.name}</strong> | 
                        Assignee: <strong>{task.assignee ? task.assignee.name : 'Unassigned'}</strong>
                      </small>
                    </div>
                    <span className={`badge ${task.status === 'DONE' ? 'bg-success' : task.status === 'IN_PROGRESS' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
                {tasks.length === 0 && <li className="list-group-item text-center py-4 text-muted">No tasks found.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
