import { useContext, useCallback, useEffect, useState } from "react";
import {
  ButtonItem,
  TextField,
  PanelSection,
  PanelSectionRow,
} from "decky-frontend-lib";
import { AppContext } from "./utils/app-context";

const Settings = () => {
  // @ts-ignore
  const { fileBrowserManager } = useContext(AppContext);
  const [port, setPort] = useState( null );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invalidPortError, setInvalidPortError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSave = useCallback(async () => {
    await fileBrowserManager.fileBrowserSendLogInfo("Attempting to save port value: " + port);
    await fileBrowserManager.fileBrowserSendLogInfo("Has errors: " + invalidPortError);
    setIsSaving(true);
    if(!invalidPortError) {
      await fileBrowserManager.setPort(port);
      showSuccess("Port Number saved successfully.");
    }
    
    setIsSaving(false);
  }, [port, invalidPortError]);

  const handlePortChange = (e) => {

    showError("");
    setInvalidPortError(true);

    const isNumeric = !isNaN(+e.target.value)
    if (!isNumeric) {
      return;
    }
    const portNumber = +e.target.value;

    // Decky uses port 1337
    if (portNumber == 1337) {
      showError("The port number 1337 cannot be used.")
      return;
    }

    // To use a port equal or lower than 1024 on Linux, you need root access
    if((portNumber < 1024)  || (portNumber > 65535)) {
      return;
    }

    setPort(portNumber);
    setInvalidPortError(false);
  };

  const showError = (message: string) => {
    setSuccessMessage("");
    setErrorMessage(message);
  };

  const showSuccess = (message: string) => {
    setErrorMessage("");
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  useEffect(() => {
    const loadDefaults = async () => {
      setIsLoading(true);
      const _port = await fileBrowserManager.getPortFromSettings();
      setPort(_port);
      setIsLoading(false);
    };

    loadDefaults();  
  }, []);

  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      {isLoading ? (
        <div style={{ textAlign: "center" }}>
          <h2>Loading...</h2>
        </div>
      ) : (
        <PanelSection title="File Browser options">
          <PanelSectionRow>
            <TextField
              label="Port"
              description="TCP port used for connection. The port number 1337 cannot be used because of decky."
              mustBeNumeric
              rangeMin={1025}
              rangeMax={65535}
              onChange={handlePortChange}
              style={{
                border: invalidPortError ? "1px red solid" : undefined,
              }}
            />
            {errorMessage && (
            <PanelSectionRow>
              <div style={{ color: 'red', fontWeight: '300' }}>
                {errorMessage}
              </div>
            </PanelSectionRow>
            )}
            {successMessage && (
            <PanelSectionRow>
              <div style={{ color: 'green', fontWeight: 'bold' }}>
                {successMessage}
              </div>
            </PanelSectionRow>
            )}
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem onClick={handleSave} disabled={isSaving}>
              Save
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}
    </div>
  );
};

export default Settings;
