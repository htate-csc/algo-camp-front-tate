import axios from "axios"

const PAIZA_BASE_URL = "/api-paiza"

export interface PaizaCreateResponse {
  id: string
  status: "running" | "completed"
  error?: string
}

export interface PaizaStatusResponse {
  id: string
  status: "running" | "completed"
  error?: string
}

export interface PaizaDetailsResponse {
  id: string
  language: string
  status: "running" | "completed"
  build_stdout: string | null
  build_stderr: string | null
  build_exit_code: number | null
  build_time: number | null // in seconds, can be string/number
  build_memory: number | null // in bytes
  build_result: "success" | "failure" | "error" | null
  stdout: string | null
  stderr: string | null
  exit_code: number | null
  time: number | null // in seconds, can be string/number
  memory: number | null // in bytes
  result: "success" | "failure" | "error" | "timeout" | null
}

export const paizaClient = {
  /**
   * Create a runner session to build and run code
   */
  async createSession(
    sourceCode: string,
    language: string,
    input: string,
  ): Promise<PaizaCreateResponse> {
    const body = new URLSearchParams({
      api_key: "guest",
      source_code: sourceCode,
      language,
      input,
    })

    const response = await axios.post<PaizaCreateResponse>(
      `${PAIZA_BASE_URL}/runners/create.json`,
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )
    return response.data
  },

  /**
   * Get status of current session
   */
  async getStatus(id: string): Promise<PaizaStatusResponse> {
    const response = await axios.get<PaizaStatusResponse>(
      `${PAIZA_BASE_URL}/runners/get_status.json`,
      {
        params: {
          api_key: "guest",
          id: id,
        },
      },
    )
    return response.data
  },

  /**
   * Get detailed session information
   */
  async getDetails(id: string): Promise<PaizaDetailsResponse> {
    const response = await axios.get<PaizaDetailsResponse>(
      `${PAIZA_BASE_URL}/runners/get_details.json`,
      {
        params: {
          api_key: "guest",
          id: id,
        },
      },
    )
    return response.data
  },
}
