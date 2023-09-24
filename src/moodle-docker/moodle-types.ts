/**
 * Structure of warnings returned by WS.
 */
export interface CoreWSExternalWarning {
  /**
   * Item.
   */
  item?: string

  /**
   * Item id.
   */
  itemid?: number

  /**
   * The warning code can be used by the client app to implement specific behaviour.
   */
  warningcode: string

  /**
   * Untranslated english message to explain the warning.
   */
  message: string
}

/**
 * Structure of files returned by WS.
 */
export interface CoreWSExternalFile {
  /**
   * Downloadable file url.
   */
  fileurl: string
  /**
   * File name.
   */
  filename?: string
  /**
   * File path.
   */
  filepath?: string
  /**
   * File size.
   */
  filesize?: number
  /**
   * Time modified.
   */
  timemodified?: number
  /**
   * File mime type.
   */
  mimetype?: string
  /**
   * Whether is an external file.
   */
  isexternalfile?: number
  /**
   * The repository type for external files.
   */
  repositorytype?: string
}
