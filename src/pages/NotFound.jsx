import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  // location.pathname is already relative to basename in React Router v6
  const badPath = location.pathname;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-color, #0f1117)",
        color: "var(--text-primary, #e2e8f0)",
        fontFamily: "inherit",
        padding: "2rem",
        textAlign: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Glow blob */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* 404 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ position: "relative", marginBottom: "0.5rem" }}
      >
        <span
          style={{
            fontSize: "clamp(7rem, 22vw, 14rem)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.05em",
            background:
              "linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #4f46e5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            userSelect: "none",
            display: "block",
          }}
        >
          404
        </span>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{
          fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
          fontWeight: 700,
          margin: "0 0 0.75rem",
        }}
      >
        Page not found
      </motion.h1>

      {/* Bad path pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        style={{ marginBottom: "1.25rem" }}
      >
        <code
          style={{
            display: "inline-block",
            padding: "0.35rem 0.9rem",
            borderRadius: "999px",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.3)",
            color: "#a5b4fc",
            fontSize: "0.9rem",
            fontFamily: "monospace",
            wordBreak: "break-all",
            maxWidth: "90vw",
          }}
        >
          {badPath}
        </code>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{
          color: "var(--text-muted, #94a3b8)",
          fontSize: "1rem",
          maxWidth: "380px",
          lineHeight: 1.6,
          margin: "0 0 2.5rem",
        }}
      >
        This route doesn't exist in Team Task Manager. Double-check the URL or
        head back to safety.
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "1px solid rgba(99,102,241,0.35)",
            background: "transparent",
            color: "#a5b4fc",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(99,102,241,0.1)";
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
          }}
        >
          <ArrowLeft size={16} /> Go back
        </button>

        {/* navigate("/") goes to the basename root — Dashboard or Login depending on auth */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#fff",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
            transition: "opacity 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.boxShadow =
              "0 4px 14px rgba(99,102,241,0.35)";
          }}
        >
          <Home size={16} /> Dashboard
        </button>
      </motion.div>
    </div>
  );
}
