export interface CaptchaResponse {
  captcha: string;
  salt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  salt: string;
  captcha_answer: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}