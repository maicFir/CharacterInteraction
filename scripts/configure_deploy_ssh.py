"""Validate a user-pinned server key locally. Never discover or trust keys from the network."""

import os
import re
import subprocess
import tempfile
from pathlib import Path

KEY_TYPES = {
    "ssh-ed25519",
    "ssh-rsa",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
}


def configure(directory, host, port, private_key, known_hosts):
    host, port = host.strip(), (port.strip() or "22")
    if not re.fullmatch(r"[a-zA-Z0-9.-]+", host):
        raise ValueError("SSH_HOST 只填写实际 SSH 域名或 IPv4，不包含协议、端口或路径。")
    if not port.isascii() or not port.isdigit() or not 1 <= int(port) <= 65535:
        raise ValueError("SSH_PORT 必须是 1–65535 的端口数字。")
    port = str(int(port))
    for name, value in [("SSH_PRIVATE_KEY", private_key), ("SSH_KNOWN_HOSTS", known_hosts)]:
        if not value.strip():
            raise ValueError(f"Missing secret: {name}")
    if "PRIVATE KEY" in known_hosts:
        raise ValueError(
            "SSH_KNOWN_HOSTS 误填了私钥；这里只允许服务器主机公钥或 known_hosts 记录。"
        )
    identifier = host if port == "22" else f"[{host}]:{port}"
    records = []
    public_keys = []
    for line in known_hosts.replace("\\n", "\n").replace("\r\n", "\n").splitlines():
        line = line.strip().lstrip("\ufeff")
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        # A public key obtained from the trusted server console may be pasted directly.
        if parts[0] in KEY_TYPES:
            key_index = 0
            line = identifier + " " + line
        else:
            key_index = 2 if parts[0].startswith("@") else 1
        if len(parts) <= key_index + 1 or parts[key_index] not in KEY_TYPES:
            raise ValueError(
                "SSH_KNOWN_HOSTS 内容格式无法识别：只填写完整的 ssh-ed25519 AAAA... 公钥，"
                "或合法 known_hosts 记录。不要包含变量名、引号、反引号、指纹或命令文本。"
            )
        public_keys.append(" ".join(parts[key_index : key_index + 2]))
        records.append(line)
    if not records:
        raise ValueError("SSH_KNOWN_HOSTS 没有可用的服务器公钥记录。")
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory.chmod(0o700)
    with tempfile.TemporaryDirectory(dir=directory) as temporary:
        # OpenSSH can skip malformed keys during -F lookup, so validate key data first.
        public_file = Path(temporary) / "public_key"
        for public_key in public_keys:
            public_file.write_text(public_key + "\n")
            valid = subprocess.run(
                ["ssh-keygen", "-l", "-f", str(public_file)], capture_output=True, text=True
            )
            if valid.returncode != 0:
                raise ValueError(
                    "SSH_KNOWN_HOSTS 公钥格式无效或不完整。请复制服务器 .pub 文件的完整输出，"
                    "不要省略字符、插入换行或填写 SHA256 指纹。"
                )
        candidate = Path(temporary) / "known_hosts"
        candidate.write_text("\n".join(records) + "\n")
        candidate.chmod(0o600)
        match = subprocess.run(
            ["ssh-keygen", "-F", identifier, "-f", str(candidate)],
            capture_output=True,
            text=True,
        )
        if match.returncode != 0:
            raise ValueError(
                "SSH_KNOWN_HOSTS 中没有匹配 SSH_HOST 和 SSH_PORT 的记录。"
                "22端口使用 host；其他端口使用 [host]:port；域名和IP不能混用。"
                "当前公钥数据有效，但记录的主机标识不匹配。建议直接填可信服务器控制台读取的 "
                "ssh_host_ed25519_key.pub 完整一行，让脚本自动补齐目标。SSH_PORT 是 SSH 登录端口，不是 API_HOST_PORT。"
            )
        matched = Path(temporary) / "matched_keys"
        matched.write_text(match.stdout)
        valid = subprocess.run(
            ["ssh-keygen", "-l", "-f", str(matched)], capture_output=True, text=True
        )
        if valid.returncode != 0:
            raise ValueError(
                "SSH_KNOWN_HOSTS 匹配到了主机，但公钥格式无效或不完整。请复制完整 .pub 公钥。"
            )
        candidate.replace(directory / "known_hosts")
    private_path = directory / "id_ed25519"
    private_path.write_text(private_key.replace("\r\n", "\n").rstrip() + "\n")
    private_path.chmod(0o600)
    print(
        "SSH host-key pin validated for the configured SSH_HOST/SSH_PORT. Strict checking remains enabled."
    )


if __name__ == "__main__":
    try:
        configure(
            Path.home() / ".ssh",
            os.environ.get("SSH_HOST", ""),
            os.environ.get("SSH_PORT", "22"),
            os.environ.get("SSH_PRIVATE_KEY", ""),
            os.environ.get("SSH_KNOWN_HOSTS", ""),
        )
    except ValueError as error:
        raise SystemExit(str(error)) from None
