"use client";

import AuthLoginForm from "../../components/AuthLoginForm";

export default function AdminLoginPage() {
  return (
    <AuthLoginForm
      title="Admin Portal"
      subtitle="Sign in to manage Cort Operations"
      submitButtonText="Sign In to Admin"
    />
  );
}
