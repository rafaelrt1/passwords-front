import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import CryptoES from "crypto-es";
import { useEffect, useState } from "react";
import {
    Modal,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TextInput,
} from "react-native";
import { KEY } from "@env";
import * as Network from "expo-network";
import * as Clipboard from "expo-clipboard";
import { ip } from "@env";

const Passwords = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const { getItem, setItem } = useAsyncStorage("@storage_key");
    const [itemId, setItemId] = useState("");
    const [typeItemId, setTypeItemId] = useState("");
    const [type, setType] = useState("");
    const [hasInternet, setHasInternet] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "",
        login: "",
        password: "",
        lastModified: "",
    });
    const [savedUsers, setSavedUsers] = useState([]);

    const encrypt = (data) => {
        const encrypted = CryptoES.AES.encrypt(data, KEY).toString();
        return encrypted;
    };

    const decrypt = (dataToDecrypt) => {
        const passDecripted = CryptoES.AES.decrypt(dataToDecrypt, KEY);
        return passDecripted.toString(CryptoES.enc.Utf8);
    };

    const decryptResponse = (response) => {
        let decryptedItem = response;
        decryptedItem.forEach((account) => {
            return (account.password = decrypt(account.password));
        });
        setSavedUsers(decryptedItem);
        return decryptedItem;
    };

    const addAccountOnDatabase = async (method, body) => {
        try {
            const request = await fetch(`http://${ip}:5000/add-account`, {
                method: method,
                mode: "cors",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify(body),
            });
            const response = await request.json();
            return response;
        } catch (e) {
            console.error(e, "Erro ao enviar os dados para o banco");
            setModalVisible(false);
        }
    };

    const addAccount = async () => {
        let conta = newUser;
        let method;
        if (type === "update") {
            method = "PUT";
        } else {
            method = "POST";
        }
        conta.password = encrypt(conta.password);
        let body = { account: conta };
        if (method === "PUT" && itemId) {
            body.account.id = itemId;
        }
        await storeData(method, null);
        await getDecryptedLocalAccounts();
        setModalVisible(false);
        const allAccounts = await addAccountOnDatabase(method, body);
        await setItem(JSON.stringify(allAccounts));
        setSavedUsers(decryptResponse(allAccounts));
    };

    const getEncryptedLocalAccounts = async () => {
        try {
            const item = await getItem();
            return item;
        } catch (e) {
            console.error("Erro ao resgatar os dados salvos localmente: ", e);
        }
    };

    const storeData = async (type, data) => {
        try {
            let dataToSave = [];
            let dataSaved = JSON.parse(await getEncryptedLocalAccounts())
                ? JSON.parse(await getEncryptedLocalAccounts())
                : [];
            if (dataSaved?.length) {
                dataToSave.push(dataSaved);
            }

            let obj = data || newUser;
            obj.lastModified = new Date();
            if (itemId && typeItemId === "back" && !data) {
                obj.id = itemId;
            } else if (data) {
                obj.id = data.id;
            }

            if (type === "PUT") {
                let item;
                if (typeItemId === "front") {
                    item = itemId;
                } else {
                    dataSaved.forEach((account, index) => {
                        if (account.id === obj.id) {
                            item = index;
                        }
                    });
                }
                dataSaved.splice(item, 1, obj);
            } else {
                dataSaved.push(obj);
            }
            await setItem(JSON.stringify(dataSaved));
        } catch (e) {
            console.error("Erro ao tentar salvar dados localmente: ", e);
        }
    };

    const updateData = (account, index) => {
        let id = account?.id ? account?.id : index;
        let typeItemId = account?.id ? "back" : "front";
        setTypeItemId(typeItemId);
        let filteredInfos;
        if (account?.id) {
            filteredInfos = savedUsers.filter((account) => {
                return account.id === id;
            })[0];
        } else {
            filteredInfos = savedUsers[index];
        }
        setNewUser({
            name: filteredInfos.name,
            login: filteredInfos.login,
            password: filteredInfos.password,
        });
        setItemId(id);
        setModalVisible(true);
    };

    const deleteInfo = async (account, index) => {
        let accounts = await getItem();
        accounts = JSON.parse(accounts);
        accounts.splice(index, 1);
        if (!accounts.length) {
            await setItem("");
        } else {
            await setItem(JSON.stringify(accounts));
        }
        await getDecryptedLocalAccounts();
        try {
            fetch(`http://${ip}:5000/account`, {
                method: "DELETE",
                mode: "cors",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify({ id: account.id }),
            })
                .then((res) => res.json())
                .then(
                    async (result) => {},
                    (error) => {
                        console.error(error);
                    }
                );
        } catch (e) {
            console.error(e);
        }
    };

    const getDecryptedLocalAccounts = async () => {
        var item = await getItem();
        if (item?.length) {
            item = JSON.parse(item);

            let decryptedItem = [];
            item.forEach((account) => {
                let data = {};
                if (account?.id) {
                    data.id = account.id;
                }
                data.login = account.login;
                data.name = account.name;
                data.password = decrypt(account.password);
                decryptedItem.push(data);
            });
            setSavedUsers(decryptedItem);
        } else {
            setSavedUsers([]);
        }
        return;
    };

    const handleCloudUpdate = async () => {
        const request = await fetch(`http://${ip}:5000/delete-all-accounts`, {
            method: "DELETE",
            mode: "cors",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json;charset=UTF-8",
            },
        });

        let users = await getItem();

        if (!users || !users.length || users === "") {
            return setSavedUsers([]);
        }

        users = JSON.parse(users);
        let allDataFromDb;
        users.forEach(async (account, index) => {
            const checkIsLastItem = async (response, index) => {
                if (index === users.length - 1) {
                    await setItem(JSON.stringify(response));
                    setSavedUsers(decryptResponse(response));
                }
            };
            let body = { account: account };
            allDataFromDb = await addAccountOnDatabase("POST", body);
            checkIsLastItem(allDataFromDb, index);
        });
    };

    useEffect(() => {
        const getNetworkState = async () => {
            const networkState = await Network.getNetworkStateAsync();
            setHasInternet(networkState.isInternetReachable);
            if (networkState.isInternetReachable) {
                handleCloudUpdate();
            } else {
                await getDecryptedLocalAccounts();
            }
        };
        getNetworkState();
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.centeredView}>
            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <ScrollView contentContainerStyle={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Nome:</Text>
                        <TextInput
                            style={styles.input}
                            value={newUser.name}
                            onChangeText={(text) => {
                                setNewUser((prevState) => ({
                                    ...prevState,
                                    name: text,
                                }));
                            }}
                        />
                        <Text style={styles.modalText}>Login:</Text>
                        <TextInput
                            style={styles.input}
                            value={newUser.login}
                            onChangeText={(text) => {
                                setNewUser((prevState) => ({
                                    ...prevState,
                                    login: text,
                                }));
                            }}
                        />
                        <Text style={styles.modalText}>Senha:</Text>
                        <TextInput
                            style={styles.input}
                            value={newUser.password}
                            onChangeText={(text) => {
                                setNewUser((prevState) => ({
                                    ...prevState,
                                    password: text,
                                }));
                            }}
                        />
                        <View style={styles.options}>
                            <TouchableOpacity
                                disabled={
                                    !newUser.login?.length ||
                                    !newUser.password?.length ||
                                    !newUser.name?.length
                                }
                                style={
                                    !newUser.login?.length ||
                                    !newUser.password?.length ||
                                    !newUser.name?.length
                                        ? [styles.button, styles.disabledButton]
                                        : [styles.button, styles.buttonSave]
                                }
                                onPress={() => addAccount()}
                            >
                                <Text style={styles.textStyle}>Salvar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonClose]}
                                onPress={() => setModalVisible(!modalVisible)}
                            >
                                <Text style={styles.textStyle}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </Modal>

            <>
                {/* {hasInternet ? (
                    <TouchableOpacity
                        style={[styles.button, styles.actionButton]}
                    >
                        <Ionicons
                            name="cloud-upload-outline"
                            size={50}
                            onPress={handleCloudUpdate}
                        />
                    </TouchableOpacity>
                ) : null} */}
                {savedUsers?.length ? (
                    <>
                        <Text style={styles.title}>Suas Senhas:</Text>
                        <ScrollView
                            contentContainerStyle={styles.credentialCards}
                        >
                            {savedUsers.map((account, index) => {
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.card}
                                        onPress={() => {
                                            setType("update");
                                            updateData(account, index);
                                        }}
                                    >
                                        <Text style={styles.cardTitle}>
                                            {account.name}
                                        </Text>
                                        <View style={styles.cardInfos}>
                                            <Text style={styles.cardInfo}>
                                                {`Usuário: ${account.login}`}
                                            </Text>
                                        </View>
                                        <View style={styles.cardInfos}>
                                            <Text style={styles.cardInfo}>
                                                {`Senha: ${account.password}`}
                                            </Text>
                                        </View>
                                        <AntDesign
                                            style={styles.icon}
                                            name="delete"
                                            size={30}
                                            color="red"
                                            onPress={() =>
                                                deleteInfo(account, index)
                                            }
                                        />
                                        <TouchableOpacity
                                            onPress={async () =>
                                                await Clipboard.setStringAsync(
                                                    account.login
                                                )
                                            }
                                            style={[
                                                styles.button,
                                                styles.buttonCopy,
                                            ]}
                                        >
                                            <Text style={styles.textStyle}>
                                                Copiar usuário
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={async () =>
                                                await Clipboard.setStringAsync(
                                                    account.password
                                                )
                                            }
                                            style={[
                                                styles.button,
                                                styles.buttonCopy,
                                            ]}
                                        >
                                            <Text style={styles.textStyle}>
                                                Copiar senha
                                            </Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </>
                ) : (
                    <View>
                        <Text style={styles.title}>
                            Você não tem senhas salvas
                        </Text>
                    </View>
                )}
            </>

            <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={() => {
                    setNewUser({ name: "", login: "", password: "" });
                    setType("add");
                    setModalVisible(true);
                }}
            >
                <Ionicons name="add-circle" size={70} color="green" />
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        alignItems: "center",
        marginTop: 22,
    },

    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },

    button: {
        borderRadius: 10,
        minWidth: 90,
        padding: 10,
    },

    disabledButton: {
        backgroundColor: "#ccc",
        color: "#999",
    },

    actionButton: {
        alignSelf: "flex-start",
        padding: 0,
        paddingLeft: 30,
        marginBottom: 20,
    },

    buttonSave: {
        backgroundColor: "#1E943D",
    },

    buttonCopy: {
        backgroundColor: "#0000BD",
        marginTop: 10,
    },

    buttonClose: {
        backgroundColor: "#FC0303",
    },

    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 16,
    },

    modalText: {
        textAlign: "center",
    },

    input: {
        marginTop: 10,
        marginBottom: 10,
        fontSize: 15,
        borderWidth: 1,
        borderRadius: 5,
        width: 200,
        padding: 10,
    },

    label: {
        fontSize: 20,
    },

    title: {
        fontSize: 20,
        fontWeight: "500",
        marginBottom: 15,
    },

    credentialCards: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
    },

    card: {
        padding: 20,
        maxWidth: 300,
        minWidth: 300,
        borderRadius: 5,
        backgroundColor: "#FFFFFF",
        margin: 10,
        borderColor: "#c8c8c8",
        borderWidth: 1,
        justifyContent: "space-between",
    },

    cardTitle: {
        color: "#000000",
        fontWeight: "600",
        fontSize: 20,
        textAlign: "center",
        marginBottom: 10,
    },

    cardInfos: {
        flexDirection: "row",
    },

    cardInfo: {
        color: "#333333",
        fontSize: 18,
        marginTop: 10,
        marginBottom: 10,
        wordBreak: "break-word",
    },

    options: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignSelf: "stretch",
    },

    icon: {
        marginTop: 10,
    },
});

export default Passwords;
