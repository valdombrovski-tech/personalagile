declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    addVirtualFileSystem(vfs: unknown): void
    createPdf(definition: unknown): { getBlob(): Promise<Blob> }
  }
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: unknown
  export default vfs
}