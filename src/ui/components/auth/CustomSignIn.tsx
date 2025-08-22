import React from "react";
import MagicLinkSignIn from "./MagicLinkSignIn";

// Re-export MagicLinkSignIn as CustomSignIn for backwards compatibility
const CustomSignIn = () => {
    return <MagicLinkSignIn />;
};

export default CustomSignIn;
