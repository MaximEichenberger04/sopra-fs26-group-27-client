"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "antd";
import { BookOutlined, CodeOutlined, GlobalOutlined } from "@ant-design/icons";
import styles from "@/styles/page.module.css";

export default function Home() {
  const router = useRouter();

  return (
    <>
      <div className="Title">
        <h1>SoPra Group 27</h1>
      </div>

      <div className={styles.page}>
        <main className={styles.main}>
          <Image
            src="/quoridor.png"
            alt="Quoridor"
            width={612}
            height={408}
            priority
          />

          <h2>Group 27 Members:</h2>
          <ol>
            <li>Maxim</li>
            <li>Flint</li>
            <li>Timon</li>
            <li>Jonas</li>
            <li>Eldar</li>
          </ol>

          <div className={styles.ctas}>
            <Button
              type="primary"
              color="red"
              variant="solid"
              onClick={() =>
                globalThis.open(
                  "https://vercel.com/new",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              Deploy now
            </Button>

            <Button
              type="default"
              variant="solid"
              onClick={() =>
                globalThis.open(
                  "https://nextjs.org/docs",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              Read our docs
            </Button>

            <Button
              type="primary"
              variant="solid"
              onClick={() => router.push("/login")}
            >
              Go to login
            </Button>
          </div>
        </main>

        <footer className={styles.footer}>
          <Button
            type="link"
            icon={<BookOutlined />}
            href="https://nextjs.org/learn"
            target="_blank"
          >
            Learn
          </Button>

          <Button
            type="link"
            icon={<CodeOutlined />}
            href="https://vercel.com/templates?framework=next.js"
            target="_blank"
          >
            Examples
          </Button>

          <Button
            type="link"
            icon={<GlobalOutlined />}
            href="https://nextjs.org"
            target="_blank"
          >
            Go to nextjs.org →
          </Button>
        </footer>
      </div>
    </>
  );
}