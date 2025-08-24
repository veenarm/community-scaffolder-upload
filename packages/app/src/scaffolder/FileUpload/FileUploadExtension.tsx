import React, { useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import { useApi, fetchApiRef, identityApiRef, errorApiRef } from '@backstage/core-plugin-api';
import LinearProgress from '@material-ui/core/LinearProgress';

export const FileUploadExtension = ({
  onChange,
  rawErrors,
  required,
  formData,
}: FieldExtensionComponentProps<string>) => {
  const [loading, setLoading] = useState(false);
  const fetchApi = useApi(fetchApiRef);
  const identityApi = useApi(identityApiRef);
  const errorApi = useApi(errorApiRef);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    if (files && files.length > 0) {
      setLoading(true);
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const { token } = await identityApi.getCredentials();

      const response = await fetchApi.fetch(
        '/api/file-upload/files/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        errorApi.post(new Error(`Failed to upload file: ${response.statusText}`));
        setLoading(false);
        return;
      }

      const data = await response.json();
      onChange(data.path);
      setLoading(false);
    }
  };

  return (
    <FormControl
      margin="normal"
      required={required}
      error={rawErrors?.length > 0 && !formData}
    >
      <InputLabel htmlFor="file-upload">Upload File</InputLabel>
      <Input id="file-upload" type="file" onChange={handleFileChange} disabled={loading} />
      {loading && <LinearProgress />}
      <FormHelperText>
        The file will be uploaded to a temporary location.
      </FormHelperText>
    </FormControl>
  );
};
