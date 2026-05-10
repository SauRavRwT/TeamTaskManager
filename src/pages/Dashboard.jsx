import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Plus,
  Folder,
  CheckCircle,
  Clock,
  Circle,
  Trash2,
} from "lucide-react";
import {
  canCreateProject,
  canDeleteProject,
  canDeleteTask,
  canEditTaskStatus,
  getAllowedTaskStatuses,
  isAdmin,
} from "../utils/permissions";

// Status helpers

const STATUS_META = {
  TODO: {
    label: "To Do",
    color: "var(--text-muted)",
    bg: "var(--bg-color-tertiary)",
    Icon: Circle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "var(--warning-color)",
    bg: "rgba(210,153,34,0.12)",
    Icon: Clock,
  },
  DONE: {
    label: "Done",
    color: "var(--success-color)",
    bg: "rgba(63,185,80,0.12)",
    Icon: CheckCircle,
  },
};

function StatusIcon({ status }) {
  const { Icon, color } = STATUS_META[status] || STATUS_META.TODO;
  return <Icon size={16} style={{ color }} />;
}

function InlineStatusSelect({ task, onUpdate, user }) {
  const allowed = getAllowedTaskStatuses(user);
  const meta = STATUS_META[task.status] || STATUS_META.TODO;

  return (
    <select
      className="form-select form-select-sm border-0 shadow-none fw-semibold"
      value={task.status}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onUpdate(task.id, e.target.value);
      }}
      style={{
        width: 140,
        background: meta.bg,
        color: meta.color,
        cursor: "pointer",
      }}
    >
      {allowed.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}

// Main component

export default function Dashboard() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create-project form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Mutable refs so listeners always read the latest snapshot
  const usersRef = useRef({});
  const projectsRef = useRef({});
  const tasksRef = useRef({});

  // Derive display state from raw maps
  const sync = (user) => {
    const usersData = usersRef.current;
    const projectsData = projectsRef.current;
    const tasksData = tasksRef.current;

    // Projects
    const parsedProjects = Object.entries(projectsData).map(([pid, p]) => {
      const manager = usersData[p.managerId] || { name: "Unknown" };
      const taskCount = Object.values(tasksData).filter(
        (t) => t.projectId === pid,
      ).length;
      return { id: pid, ...p, manager, _count: { tasks: taskCount } };
    });
    setProjects(parsedProjects);

    // Tasks
    let parsedTasks = Object.entries(tasksData).map(([tid, t]) => ({
      id: tid,
      ...t,
      project: projectsData[t.projectId] || { name: "Unknown Project" },
      assignee: t.assigneeId ? (usersData[t.assigneeId] ?? null) : null,
    }));

    // MEMBERs only see tasks assigned to them
    if (user?.role !== "ADMIN") {
      parsedTasks = parsedTasks.filter((t) => t.assigneeId === user?.id);
    }

    setTasks(parsedTasks);
  };

  // Real-time Firebase listeners
  useEffect(() => {
    if (!dbUser) return;

    // Show UI immediately — listeners will populate data as they arrive
    setLoading(false);

    const unsubUsers = onValue(
      ref(db, "users"),
      (snap) => {
        usersRef.current = snap.val() || {};
        sync(dbUser);
      },
      (err) => console.error("users listener:", err),
    );

    const unsubProjects = onValue(
      ref(db, "projects"),
      (snap) => {
        projectsRef.current = snap.val() || {};
        sync(dbUser);
      },
      (err) => console.error("projects listener:", err),
    );

    const unsubTasks = onValue(
      ref(db, "tasks"),
      (snap) => {
        tasksRef.current = snap.val() || {};
        sync(dbUser);
      },
      (err) => console.error("tasks listener:", err),
    );

    return () => {
      unsubUsers();
      unsubProjects();
      unsubTasks();
    };
  }, [dbUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!canCreateProject(dbUser) || !newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const newRef = push(ref(db, "projects"));
      await set(newRef, {
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        managerId: dbUser.id,
        createdAt: new Date().toISOString(),
      });
      setNewProjectName("");
      setNewProjectDesc("");
    } catch (err) {
      console.error("createProject:", err);
      alert("Failed to create project. Check your permissions.");
    } finally {
      setIsCreating(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await update(ref(db, `tasks/${taskId}`), { status: newStatus });
      // onValue listener automatically syncs the UI
    } catch (err) {
      console.error("updateTaskStatus:", err);
      alert("Failed to update status. You may not have permission.");
    }
  };

  const removeTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    if (!canDeleteTask(dbUser)) return;
    try {
      await remove(ref(db, `tasks/${taskId}`));
    } catch (err) {
      console.error("removeTask:", err);
    }
  };

  const removeProject = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this project and all its tasks?")) return;
    if (!canDeleteProject(dbUser)) return;
    try {
      // Remove project
      await remove(ref(db, `projects/${projectId}`));
      // Remove all tasks belonging to this project
      const projectTasks = Object.entries(tasksRef.current)
        .filter(([, t]) => t.projectId === projectId)
        .map(([tid]) => tid);
      await Promise.all(
        projectTasks.map((tid) => remove(ref(db, `tasks/${tid}`))),
      );
    } catch (err) {
      console.error("removeProject:", err);
    }
  };

  // Animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // Loading guard
  if (loading || !dbUser)
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark px-4 py-3 sticky-top">
        <div className="container-fluid">
          <Link
            className="navbar-brand fw-bold d-flex align-items-center gap-2"
            to="/"
          >
            <div
              style={{
                width: 24,
                height: 24,
                background: "var(--accent-color)",
                borderRadius: 6,
              }}
            />
            TeamTaskManager
          </Link>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted d-none d-md-inline">
              {dbUser.name}
              <span
                className="badge ms-2"
                style={{
                  background: isAdmin(dbUser)
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(34,197,94,0.15)",
                  color: isAdmin(dbUser) ? "#818cf8" : "#4ade80",
                  border: `1px solid ${isAdmin(dbUser) ? "#818cf855" : "#4ade8055"}`,
                }}
              >
                {dbUser.role}
              </span>
            </span>
            <button
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-4 mt-5">
        <div className="row g-4">
          {/* Projects sidebar */}
          <div className="col-12 col-lg-3">
            <h5 className="text-muted fw-bold mb-4 d-flex justify-content-between align-items-center">
              PROJECTS
              <span className="badge bg-secondary rounded-pill">
                {projects.length}
              </span>
            </h5>

            {/* Create project form — ADMIN only */}
            {canCreateProject(dbUser) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card mb-4 border-0"
              >
                <div className="card-body p-3">
                  <form onSubmit={createProject}>
                    <div className="mb-2">
                      <label
                        className="form-label text-muted small fw-bold"
                        htmlFor="project_name_id"
                      >
                        PROJECT NAME
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="New Project Name"
                        required
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        id="project_name_id"
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        className="form-label text-muted small fw-bold"
                        htmlFor="project_desc_id"
                      >
                        DESCRIPTION
                      </label>
                      <textarea
                        className="form-control form-control-sm"
                        placeholder="Description (optional)"
                        rows={2}
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        id="project_desc_id"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                      disabled={isCreating}
                    >
                      <Plus size={16} />{" "}
                      {isCreating ? "Creating…" : "Create Project"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Project list */}
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="list-group list-group-flush gap-2"
              style={{ listStyle: "none", paddingLeft: 0 }}
            >
              <AnimatePresence>
                {projects.map((project) => (
                  <motion.li
                    variants={itemVariants}
                    key={project.id}
                    layout
                    className="list-group-item border rounded p-0 position-relative overflow-hidden"
                    style={{ background: "var(--bg-color-tertiary)" }}
                  >
                    <Link
                      to={`/project/${project.id}`}
                      className="text-decoration-none d-flex flex-column gap-2 p-3 h-100"
                      style={{
                        paddingRight: isAdmin(dbUser) ? "3.5rem" : undefined,
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
                          <Folder size={16} /> {project.name}
                        </h6>
                        <span
                          className="badge bg-dark rounded-pill border flex-shrink-0"
                          style={{ borderColor: "var(--border-color)" }}
                        >
                          {project._count?.tasks ?? 0}
                        </span>
                      </div>
                      {project.description && (
                        <p className="small text-muted mb-0 text-truncate">
                          {project.description}
                        </p>
                      )}
                      <small className="text-muted">
                        Lead: {project.manager.name}
                      </small>
                    </Link>

                    {canDeleteProject(dbUser) && (
                      <button
                        className="btn btn-sm btn-outline-danger border-0 position-absolute"
                        style={{ top: 46, right: 12, zIndex: 3 }}
                        onClick={(e) => removeProject(e, project.id)}
                        title="Delete Project"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>

              {projects.length === 0 && (
                <p className="text-muted small mt-2">No projects yet.</p>
              )}
            </motion.ul>
          </div>

          {/* Task area */}
          <div className="col-12 col-lg-9">
            <h4 className="fw-bold mb-4">
              {isAdmin(dbUser) ? "All Workspace Tasks" : "My Assigned Tasks"}
            </h4>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="d-flex flex-column gap-2"
            >
              <AnimatePresence>
                {tasks.length > 0 ? (
                  tasks.map((task) => {
                    const canEdit = canEditTaskStatus(dbUser, task);

                    return (
                      <motion.div
                        variants={itemVariants}
                        key={task.id}
                        layout
                        className="card border-0 p-3"
                        style={{ background: "var(--bg-color-secondary)" }}
                      >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                          {/* Left: info */}
                          <div className="d-flex align-items-start gap-3">
                            <div className="mt-1">
                              <StatusIcon status={task.status} />
                            </div>
                            <div>
                              <h6 className="mb-1 fw-bold">{task.title}</h6>
                              {task.description && (
                                <p className="mb-2 text-muted small">
                                  {task.description}
                                </p>
                              )}
                              <div className="d-flex flex-wrap gap-2">
                                <span
                                  className="badge bg-dark text-light border"
                                  style={{ borderColor: "var(--border-color)" }}
                                >
                                  <Folder size={12} className="me-1" />
                                  {task.project.name}
                                </span>
                                <span
                                  className="badge bg-dark text-light border"
                                  style={{ borderColor: "var(--border-color)" }}
                                >
                                  {task.assignee
                                    ? task.assignee.name
                                    : "Unassigned"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: status control + delete */}
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {canEdit ? (
                              /*
                               * ADMIN → can edit any task
                               * MEMBER → can edit only their assigned tasks
                               * Both get the full TODO / IN_PROGRESS / DONE select
                               */
                              <InlineStatusSelect
                                task={task}
                                onUpdate={updateTaskStatus}
                                user={dbUser}
                              />
                            ) : (
                              <span
                                className="badge px-3 py-2"
                                style={{
                                  background:
                                    STATUS_META[task.status]?.bg ??
                                    "var(--bg-color-tertiary)",
                                  color:
                                    STATUS_META[task.status]?.color ??
                                    "inherit",
                                  border: "1px solid currentColor",
                                }}
                              >
                                {task.status.replace("_", " ")}
                              </span>
                            )}

                            {canDeleteTask(dbUser) && (
                              <button
                                className="btn btn-sm btn-outline-danger border-0"
                                onClick={() => removeTask(task.id)}
                                title="Delete Task"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-5"
                  >
                    <div className="d-inline-flex align-items-center justify-content-center bg-dark rounded-circle p-4 mb-3">
                      <CheckCircle size={32} className="text-muted" />
                    </div>
                    <h5>You're all caught up!</h5>
                    <p className="text-muted">
                      {isAdmin(dbUser)
                        ? "Create a project and assign tasks to get started."
                        : "No tasks have been assigned to you yet."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
