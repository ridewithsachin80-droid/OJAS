import { useState, useEffect, useCallback } from "react";
import ProjectsList    from "./components/ProjectsList.jsx";
import ProjectDetail   from "./components/ProjectDetail.jsx";
import AdminLogin      from "./components/AdminLogin.jsx";
import AdminDashboard  from "./components/AdminDashboard.jsx";
import { getProjects, getProject, verifyToken, logout } from "./api.js";

/* Simple hash router: #/, #/project/:id, #/admin */
function getRoute() {
  const hash = window.location.hash || "#/";
  if (hash.startsWith("#/project/")) return { page: "project", id: hash.slice(10) };
  if (hash === "#/admin")            return { page: "admin" };
  if (hash === "#/admin/login")      return { page: "admin_login" };
  return { page: "home" };
}

function Loading() {
  return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#FFFDF7" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:14, animation:"pulse 1.2s infinite" }}>🕯️</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#2E7D32" }}>Loading…</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  );
}

export default function App() {
  const [route,    setRoute]    = useState(getRoute);
  const [projects, setProjects] = useState(null);
  const [project,  setProject]  = useState(null);   // currently viewed single project
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  /* Listen to hash changes */
  useEffect(() => {
    const onHash = () => { setRoute(getRoute()); setProject(null); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* On mount: check token + load projects */
  useEffect(() => {
    (async () => {
      const tokenValid = await verifyToken();
      setIsAdmin(tokenValid);
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (e) {
        console.error("Failed to load projects:", e);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Load single project when navigating to #/project/:id */
  useEffect(() => {
    if (route.page !== "project" || !route.id) return;
    // Try to find in already-loaded list first
    if (projects) {
      const found = projects.find(p => p.id === route.id);
      if (found) { setProject(found); return; }
    }
    // Fetch individually
    getProject(route.id).then(setProject).catch(console.error);
  }, [route, projects]);

  /* Navigation helpers */
  const goHome    = ()  => { window.location.hash = "#/"; };
  const goProject = (id)=> { window.location.hash = `#/project/${id}`; };
  const goAdmin   = ()  => { window.location.hash = isAdmin ? "#/admin" : "#/admin/login"; };

  const handleLogin = () => { setIsAdmin(true); window.location.hash = "#/admin"; };
  const handleLogout= () => { logout(); setIsAdmin(false); window.location.hash = "#/"; };

  const handleProjectsChange = useCallback((updated) => {
    setProjects(updated);
    // If we're viewing a project that was updated, refresh it
    if (project && route.page === "project") {
      const refreshed = updated.find(p => p.id === project.id);
      if (refreshed) setProject(refreshed);
    }
  }, [project, route]);

  if (loading) return <Loading />;

  /* Admin login page */
  if (route.page === "admin_login") {
    return <AdminLogin onLogin={handleLogin} onBack={goHome} />;
  }

  /* Admin dashboard */
  if (route.page === "admin" && isAdmin) {
    return (
      <AdminDashboard
        projects={projects || []}
        onProjectsChange={handleProjectsChange}
        onLogout={handleLogout}
        onViewPublic={goHome}
      />
    );
  }

  /* Redirect non-authed admin attempts */
  if (route.page === "admin" && !isAdmin) {
    window.location.hash = "#/admin/login";
    return <Loading />;
  }

  /* Single project detail */
  if (route.page === "project") {
    if (!project) return <Loading />;
    return (
      <ProjectDetail
        project={project}
        onBack={goHome}
      />
    );
  }

  /* Home — projects list */
  return (
    <ProjectsList
      projects={projects || []}
      onSelect={goProject}
      onAdminClick={goAdmin}
    />
  );
}
