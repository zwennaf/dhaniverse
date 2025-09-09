import React from "react";
import { useNavigate } from "react-router-dom";

// Sign-up now redirects to sign-in (magic link flow) without blocking mobile devices.
const CustomSignUp: React.FC = () => {
  const navigate = useNavigate();

  // Redirect to sign-in page since we now use magic links for both sign-in and sign-up
  React.useEffect(() => {
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  return null;
};

export default CustomSignUp;