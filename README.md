psa: for some reason wakatime decided to tweak out so here are my other hackatime projects:

- https://hackatime-badge.hackclub.com/U074B2Y4ANL/welcome
- https://hackatime-badge.hackclub.com/U074B2Y4ANL/research-extension

# researcher

finds research papers related to the topic in your notes by web scraping different academic databases
> inspired by my ap seminar-traumatized friends (a class which involves doing a lot of research on topics) and my desire to procrastinate my summer hw

## features
- uses AI to identify the most important research phrases from your notes
- searches research paper databases using each phrase; papers update automatically as you type
- enables organization by having different pages for each topic
- generates summaries for the papers using AI

## usage
1. begin writing your research notes in the main text area
2. the system automatically extracts key research phrases
3. relevant papers appear in the right side bar
4. click on a paper or generate a summary!

## installation  
1. **Clone the repository**
   ```bash
   git clone https://github.com/sophia0805/research-extension
   cd research-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## history
I struggled a lot with discovering how to web scrape specific academic databases, since it was something I hadn't previously explored. Some of the sites I initially tried to use (such as science direct) had prevention in place so I just cut them out/replaced them with other sites. 
### original concept design from figma:
![](https://hc-cdn.hel1.your-objectstorage.com/s/v3/444ae8f012535ac80328e447c5c0b88b10611a34_image.png)
![](https://hc-cdn.hel1.your-objectstorage.com/s/v3/2af74a6b7edeb08c517c81fa8f4a55f8e52974b4_image.png)
### finished project:
![](https://hc-cdn.hel1.your-objectstorage.com/s/v3/53a81dc698495ee42c0bed09c4b41631e4bd9bbe_image.png)