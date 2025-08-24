import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { FileUploadExtension } from './FileUploadExtension';

export const FileUploadFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'FileUpload',
    component: FileUploadExtension,
  }),
);
