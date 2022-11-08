import { useEffect, useState } from "react";
import CryptoES from "crypto-es";
import {
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from "react-native";
import { KEY } from "@env";
import { ip } from "@env";

export default function Login({ navigation }) {
    const [password, setPassword] = useState("");
    const [createPassword, setCreatePassword] = useState();
    const [hasInternet, setHasInternet] = useState(false);

    const encrypt = (data) => {
        const encrypted = CryptoES.AES.encrypt(data, KEY).toString();
        return encrypted;
    };

    const decrypt = (dataToDecrypt) => {
        const passDecripted = CryptoES.AES.decrypt(dataToDecrypt, KEY);
        return passDecripted.toString(CryptoES.enc.Utf8);
    };

    const registerPassword = (encryptedPassword) => {
        try {
            fetch(`http://${ip}:5000/app-password`, {
                method: "POST",
                mode: "cors",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify({ password: encryptedPassword }),
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        setCreatePassword(false);
                    },
                    (error) => {
                        console.error(error);
                    }
                );
        } catch (e) {
            console.error(e);
        }
    };

    const getEncryptedPassword = async () => {
        try {
            const request = await fetch(`http://${ip}:5000/app-password`, {
                method: "GET",
                mode: "cors",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json;charset=UTF-8",
                },
            });

            const passwordEncrypted = await request.json();
            return passwordEncrypted;
        } catch (e) {
            console.error(e);
        }
    };

    const openApp = async () => {
        const passEncrypted = await getEncryptedPassword();
        const passDecrypted = decrypt(passEncrypted);
        if (password === passDecrypted) {
            navigation.navigate("Senhas");
        } else {
            alert("Senha incorreta");
        }
    };

    const configPassword = async () => {
        const passEncrypted = encrypt(password);
        registerPassword(passEncrypted);
    };

    useEffect(() => {
        const searchUser = async () => {
            try {
                fetch(`http://${ip}:5000/user`, {
                    method: "GET",
                    mode: "cors",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json;charset=UTF-8",
                    },
                })
                    .then((res) => res.json())
                    .then(
                        (result) => {
                            if (result === "registered") {
                                setCreatePassword(false);
                            } else {
                                setCreatePassword(true);
                            }
                        },
                        (error) => {
                            console.error(error);
                        }
                    );
            } catch (e) {
                console.error(e);
            }
        };
        searchUser();
    }, []);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardDismissMode="on-drag"
        >
            {createPassword ? (
                <>
                    <Text style={styles.passwordLabel}>Configurar senha:</Text>
                    <TextInput
                        value={password}
                        onChangeText={(typedPassword) =>
                            setPassword(typedPassword)
                        }
                        style={styles.passwordInput}
                        secureTextEntry={true}
                    />
                    <TouchableOpacity
                        style={[styles.button, styles.buttonEnter]}
                        onPress={configPassword}
                    >
                        <Text style={styles.textStyle}>Criar</Text>
                    </TouchableOpacity>
                </>
            ) : createPassword === false ? (
                <>
                    <Text style={styles.passwordLabel}>Senha:</Text>
                    <TextInput
                        value={password}
                        onChangeText={(typedPassword) =>
                            setPassword(typedPassword)
                        }
                        style={styles.passwordInput}
                        secureTextEntry={true}
                    />
                    <TouchableOpacity
                        style={[styles.button, styles.buttonEnter]}
                        onPress={openApp}
                    >
                        <Text style={styles.textStyle}>Entrar</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <></>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },

    passwordInput: {
        marginTop: 10,
        marginBottom: 10,
        fontSize: 15,
        borderWidth: 1,
        borderRadius: 5,
        width: 200,
        padding: 10,
    },

    passwordLabel: {
        fontSize: 20,
    },

    button: {
        borderRadius: 10,
        padding: 10,
        minWidth: 130,
        marginBottom: 10,
        marginTop: 10,
    },

    disabledButton: {
        backgroundColor: "#ccc",
        color: "#999",
    },

    buttonEnter: {
        backgroundColor: "#1E943D",
    },

    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 16,
    },
});
