"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useRouter } from "next/navigation"; // use NextJS router for navigation
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import Image from "next/image";
// Optionally, you can import a CSS module or file for additional styling:
// import styles from "@/styles/page.module.css";

interface FormFieldProps {
  label: string;
  value: string;
}

const Regisration: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  // useLocalStorage hook example use
  // The hook returns an object with the value and two functions
  // Simply choose what you need from the hook:
  const {
    // value: token, // is commented out because we do not need the token value
    set: setToken, // we need this method to set the value of the token to the one we receive from the POST request to the backend server API
    // clear: clearToken, // is commented out because we do not need to clear the token when logging in
  } = useLocalStorage<string>("token", ""); // note that the key we are selecting is "token" and the default value we are setting is an empty string
  // if you want to pick a different token, i.e "usertoken", the line above would look as follows: } = useLocalStorage<string>("usertoken", "");

  const { set: setUserId } = useLocalStorage<string>("userId", ""); // we need this method to set the value of the userId to the one we receive from the POST request to the backend server API

  const handleRegistration = async (values: FormFieldProps) => {
    try {
      // Call the API service and let it handle JSON serialization and error handling
      const response = await apiService.post<User>("/users", values);

      // Use the useLocalStorage hook that returned a setter function (setToken in line 41) to store the token if available
      if (response.token) {
        setToken(response.token);
      }

      // Use the useLocalStorage hook that returned a setter function (setUserId in line 48) to store the userId if available
      if (response.id) {
        setUserId(response.id);
      }

      // Navigate to /users (dashboard)
      router.push("/users");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during login.");
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <Image
            className="auth-logo"
            src="/quoridor.png"
            alt="Quoridor Chaos Arena"
            width={400}
            height={267}
            priority
          />
        </div>

        <Form
          form={form}
          name="registration"
          size="large"
          variant="outlined"
          onFinish={handleRegistration}
          layout="vertical"
          className="auth-form"
          style={{ width: "100%" }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please choose a username." }]}
          >
            <Input placeholder="Choose a username" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Name"
            rules={[{ required: true, message: "Please enter a name." }]}
          >
            <Input placeholder="Enter your name" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please create a password." },
              { min: 8, message: "Password must be at least 8 characters." },
              {
                pattern: /[A-Z]/,
                message: "Password must contain at least one uppercase letter.",
              },
              {
                pattern: /[0-9]/,
                message: "Password must contain at least one number.",
              },]}
          >
            <Input.Password placeholder="Create a password" />
          </Form.Item>

          <Form.Item
            name="biography"
            label="Bio"
            rules={[{ required: false, message: "Please enter a bio." }]}
          >
            <Input placeholder="Enter your bio" />
          </Form.Item>

          <Form.Item style={{ marginTop: "20px" }}>
            <Button type="primary" htmlType="submit" className="auth-btn-primary">
              Register
            </Button>
          </Form.Item>

          <Form.Item>
            <Button type="default" onClick={() => router.push("/login")} className="auth-btn-secondary">
              Login
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Regisration;
