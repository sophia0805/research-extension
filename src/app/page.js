<head>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <script src="components.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/header@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/list@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/editorjs-alert@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/editorjs-drag-drop"></script>
    <script src="https://cdn.jsdelivr.net/npm/editorjs-undo"></script>
    <link rel="stylesheet" href="styles.css">
    <title>DocSpace</title>
</head>
<body style="margin: 0px;">
    <div class="sidebar">
        <div class="userarea-name">DocSpace</div>
        <div class="userarea-email"></div>
        <div class="sidebarpagecreate">Create Page</div>
        <div class="sidebarpagelist"></div>
    </div>
    <div id="mainarea"></div>
    <!-- <div id="infooverlay">
        <div id="infooverlaybox"></div>
    </div> -->
    <script>
        var doneinit = false
        var editor = ""
        let currentid = null;
        const { createClient } = supabase
        const sbc = createClient('https://fzxvknkpfouvjtfxbnkh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eHZrbmtwZm91dmp0ZnhibmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODQ1MDgsImV4cCI6MjA1MzU2MDUwOH0.jHJFkSetGgkOFfxcSMyWpsY8htPqcAYnw48xfRuoo6k')
        sbc.auth.getSession()
            .then(async (res) => {
                if (res.data.session == null) {
                    window.location.replace("/docspace/signin.html?callback=" + window.location.toString())
                } else {
                    console.log(res)
                    document.querySelector(".userarea-email").innerHTML = res.data.session.user.email;
                    reloadsidebar()
                }
        })

        var editorinit = function() {
            if (!doneinit) {
                editor = new EditorJS({
                    holder: 'mainarea',
                    tools: {
                        header: Header,
                        alert: Alert,
                        list: {
                            class: EditorjsList,
                            inlineToolbar: true,
                            config: {
                                defaultStyle: 'unordered'
                            },
                        },
                    },
                    onReady: () => {
                        new DragDrop(editor);
                        new Undo({ editor });
                    }
                });
                doneinit = true
            }
        }

        var signout = function() {
            sbc.auth.signOut()
                .then((res) => {
                    console.log(res)
                    window.location.reload()
                })
        }

        var loadpage = function(id) {
            try {
                savepage(() => {
                    editorinit()
                    currentid = id
                    sbc.from("Pages").select("*").eq("id", id)
                        .then((res) => {
                            console.log(res)
                            editor.render(res.data[0].content)
                        })
                })
            } catch {
                editorinit()
                currentid = id
                sbc.from("Pages").select("*").eq("id", id)
                    .then((res) => {
                        console.log(res)
                        editor.render(res.data[0].content)
                    })
            }
        }

        var reloadsidebar = function() {
            document.querySelector(".sidebarpagelist").innerHTML = ""
            sbc.from("Pages").select("*")
                .then((res) => {
                    console.log(res)
                    res.data.forEach(element => {
                        newdiv = document.createElement("ds-sidebar-pageitem")
                        // newdiv.classList.add("sidebarpageitem")
                        newdiv.setAttribute("onclick", "loadpage(" + element.id + ")")
                        newdiv.setAttribute("docid", element.id)
                        newdiv.setAttribute("oncontextmenu", "event.preventDefault(); deletepage(" + element.id + ")")
                        newdiv.innerHTML = element.name
                        document.querySelector(".sidebarpagelist").append(newdiv)
                    });
                })
        }

        var createpage = function() {
            editorinit()
            sbc.from("Pages").insert([{name: prompt("Page Name"), content: {"time": 1738540332650, "blocks": [], "version": "2.31.0-rc.7"}}]).select()
                .then((res) => {
                    console.log(res)
                    currentid = res.data[0].id
                    reloadsidebar()
                })
        }

        var savepage = function(callback) {
            editor.save()
                .then((outputData) => {
                    console.log('Article data: ', outputData)
                    console.log('Current ID: ', currentid)
                    if (typeof outputData !== 'object' || Array.isArray(outputData)) {
                        console.error('Invalid outputData format:', outputData);
                        return;
                    }
                    console.log('Updating page with ID:', currentid, 'with content:', outputData);
                    sbc.from("Pages").update({ content: outputData })
                        .eq("id", currentid)
                        .then((res) => {
                            console.log('Save response: ', res)
                            if (res.error) {
                                console.error('Save error: ', res.error)
                            } else {
                                console.log('Update successful:', res.data);
                                callback()
                            }
                        })
                })
                .catch((error) => {
                    console.log('Saving failed: ', error)
                });
        }

        var deletepage = function(id) {
            if (confirm("Are you sure you want to delete this page?")) {
                sbc.from("Pages").delete().eq("id", id)
                    .then((res) => {
                        console.log('Delete response: ', res)
                        if (res.error) {
                            console.error('Delete error: ', res.error)
                        } else {
                            console.log('Delete successful:', res.data);
                            reloadsidebar();
                        }
                    })
            }
        }

        var fetchUpdatedData = function(id) {
            sbc.from("Pages").select("*").eq("id", id)
                .then((res) => {
                    console.log('Fetched updated data: ', res.data);
                })
        }

        document.querySelector(".sidebarpagecreate").addEventListener("click", createpage)
        // document.querySelector(".sidebarpagelist").addEventListener("click", savepage)
        document.querySelector(".userarea-email").addEventListener("click", signout)

        let hasChanges = false;

        function markAsChanged() {
            hasChanges = true;
        }

        document.getElementById("mainarea").addEventListener("input", markAsChanged);

        setInterval(() => {
            if (hasChanges) {
                savepage();
                hasChanges = false;
            }
        }, 5000);
    </script>
</body>
</html>